const rawDiscord = require('./rawDiscord');
const discord = require('discord.js');
const dbs = require('./databases');
const drive = require('./drive');

const CLIENT_DATA = require('../private/discord-app-data.json');
const BOT_TOKEN = CLIENT_DATA.botToken;
const MAIN_GUILD = CLIENT_DATA.botGuild;
const MAIN_CHANNEL = CLIENT_DATA.botChannel;
const LIMBO_CHANNEL = CLIENT_DATA.limboChannel;
const LEAD_ROLES = CLIENT_DATA.leadRoles;

class DiscordBot {
	constructor() {
		this.client = new discord.Client();
		
		this.client.on('ready', () => {
			console.log('Bot connected!');
			this.mainGuild = this.client.guilds.get(MAIN_GUILD);
			this.mainChannel = this.client.channels.get(MAIN_CHANNEL);
			this.limboChannel = this.client.channels.get(LIMBO_CHANNEL);
			this.leadRoles = [];
			for (let id of LEAD_ROLES) {
				this.leadRoles.push(this.mainGuild.roles.get(id));
			}
			this.updateDefaultRoles();
			this.updateRoleIds();
		});
		this.client.on('roleCreate', () => this.updateRoleIds());
		this.client.on('roleDelete', () => this.updateRoleIds());
		this.client.on('roleUpdate', () => this.updateRoleIds());
		this.client.on('message', (message) => this.onMessage(message));
		this.client.on('error', console.error);
		this.client.on('rateLimit', console.error);
		this.client.login(BOT_TOKEN);
		DiscordBot.instance = this;
	}
	
	updateDefaultRoles() {
		dbs.miscConfig.get('discord', (dconfig) => {
			this.confirmedRole = this.mainGuild.roles.get(dconfig.defaultRoles.member);
			this.unconfirmedRole = this.mainGuild.roles.get(dconfig.defaultRoles.restricted);
			this.leaderRole = this.mainGuild.roles.get(dconfig.defaultRoles.leader);

			this.freshmanRole = this.mainGuild.roles.get(dconfig.defaultRoles.freshman);
			this.sophomoreRole = this.mainGuild.roles.get(dconfig.defaultRoles.sophomore);
			this.juniorRole = this.mainGuild.roles.get(dconfig.defaultRoles.junior);
			this.seniorRole = this.mainGuild.roles.get(dconfig.defaultRoles.senior);
			this.alumnusRole = this.mainGuild.roles.get(dconfig.defaultRoles.alumnus);
			this.facultyRole = this.mainGuild.roles.get(dconfig.defaultRoles.faculty);
			this.otherRole = this.mainGuild.roles.get(dconfig.defaultRoles.other);

			this.teamRoles = {};
			dbs.miscConfig.get('teams', (tlist) => {
				for (let team of tlist) {
					this.teamRoles[team] = this.mainGuild.roles.get(dconfig.defaultRoles[team + 'Team']);
				}
			});
		});
	}
	
	updateRoleIds() {
		let roleIds = [];
		for (let role of this.mainGuild.roles.values()) {
			if (role.name === '@everyone') continue;
			roleIds.push(role.id);
		}
		dbs.roleExtras.setRoles(roleIds, () => 0);
		this.updateMembersDrivePermissions([member.connections.discord.id]);
	}

	leaderCheck(message) {
		for (let role of message.member.roles.values()) {
			if (role.id === this.leaderRole.id) return true;
		}
		message.channel.send('You must be a leader to use that command.');
		return false;
	}

	parseUserIdArg(arg) {
		// https://discordapp.com/developers/docs/reference#message-formatting
		if (arg[0] === '<' && arg[1] === '@') {
			if (arg[2] === '!') return arg.slice(3).slice(0, -1);
			if (arg[2].match(/[0-9]/)) return arg.slice(2).slice(0, -1);
		}
		return null;
	}

	onMessage(message) {
		if (message.content[0] === '!') { // Command prefix.
			let command = message.content.substr(1);
			command = command.split(' ');
			let args = command.slice(1);
			command = command[0];
			if (command === 'help') {
				message.channel.send('Not yet implemented.');
			} else if (command === 'listMembers') {
				message.channel.send('Loading member list...');
				dbs.members.getAllItems((items) => {
					let list = 'The currently registered members are:\n';
					for (let member of items) {
						list += `${member.firstName} ${member.lastName} (<@${member.connections.discord.id}>)\n`;
					}
					message.channel.send(list);
				});
			} else if (command === 'test') {
				for (let role of message.member.roles.values()) {
					console.log(role.id);
				}
				this.mainChannel.send('This is another test.');
			} else if (command === 'confirm') {
				if (!this.leaderCheck(message)) return;
				if (args.length !== 1 || this.parseUserIdArg(args[0]) === null) {
					message.channel.send('Usage: !confirm [@username#nmbr]');
					return;
				} else {
					this.confirm(this.parseUserIdArg(args[0]), message.channel);
				}
			} else if (command === 'makeLeader') {
				if (!this.leaderCheck(message)) return;
				if (args.length !== 1 || this.parseUserIdArg(args[0]) === null) {
					message.channel.send('Usage: !makeLeader [@username#nmbr]');
					return;
				} else {
					this.makeLeader(this.parseUserIdArg(args[0]), message.channel);
				}
			} else if (command === 'revokeLeader') {
				if (!this.leaderCheck(message)) return;
				if (args.length !== 1 || this.parseUserIdArg(args[0]) === null) {
					message.channel.send('Usage: !revokeLeader [@username#nmbr]');
					return;
				} else {
					this.revokeLeader(this.parseUserIdArg(args[0]), message.channel);
				}
			}
		}
	}

	confirm(userId, channel) {
		dbs.members.getAllItems((members) => {
			let found = null;
			for (let member of members) {
				if (member.connections.discord.id === userId) {
					found = member;
					break;
				}
			}
			if (found.accessLevel === 'restricted') {
				found.accessLevel = 'member';
			} else {
				channel.send('<@!' + userId + '> is already a confirmed member.');
				return;
			}
			this.client.fetchUser(userId).then((user) => {
				return this.mainGuild.fetchMember(user);
			}).then((member) => {
				let roles = [this.confirmedRole];
				roles.push({
					freshman: this.freshmanRole,
					sophomore: this.sophomoreRole,
					junior: this.juniorRole,
					senior: this.seniorRole,
					alumnus: this.alumnusRole,
					faculty: this.facultyRole,
					other: this.otherRole
				}[found.gradeLevel.toLowerCase()]);
				roles.push(this.teamRoles[found.team]);
				let p = member.addRoles(roles);
				p.catch(console.error);
				p.then(() => {
					member.removeRole(this.unconfirmedRole);
				});
				channel.send('<@!' + userId + '> is now a confirmed member.');
			});
		});
	}

	makeLeader(userId, channel) {
		dbs.members.getAllItems((members) => {
			let found = null;
			for (let member of members) {
				if (member.connections.discord.id === userId) {
					found = member;
					break;
				}
			}
			if (found.accessLevel === 'member') {
				found.accessLevel = 'leader';
			} else {
				if (found.accessLevel === 'leader') {
					channel.send('<@!' + userId + '> is already a leader.');
				} else if (found.accessLevel === 'restricted') {
					channel.send('<@!' + userId + '> has not yet been confirmed as a member. Type !confirm <@!' + userId + '> to do so.');
				}
				return;
			}
			this.client.fetchUser(userId).then((user) => {
				return this.mainGuild.fetchMember(user);
			}).then((member) => {
				member.addRole(this.leaderRole);
			});
			channel.send('<@!' + userId + '> is now a leader.');
		});
	}

	revokeLeader(userId, channel) {
		dbs.members.getAllItems((members) => {
			let found = null;
			for (let member of members) {
				if (member.connections.discord.id === userId) {
					found = member;
					break;
				}
			}
			if (found.accessLevel === 'leader') {
				found.accessLevel = 'member';
			} else {
				channel.send('<@!' + userId + '> is already not a leader.');
				return;
			}
			this.client.fetchUser(userId).then((user) => {
				return this.mainGuild.fetchMember(user);
			}).then((member) => {
				member.removeRole(this.leaderRole);
				channel.send('<@!' + userId + '> is now no longer a leader.');
			});
		});
	}
	
	setupUser(userId, userToken, nickname) {
		this.client.fetchUser(userId).then((user) => {
			let guildUser = this.mainGuild.member(user);
			if (guildUser) { // If they are already on the server (they joined before automatic discord login)
				guildUser.setRoles([this.unconfirmedRole]).then(() => {
					return guildUser.setNickname(nickname);
				}, console.error).then(() => {
					this.mainChannel.send(`Please welcome <@${userId}> to the server!`);
					this.limboChannel.send(`<@${userId}>, your information has been received. Please wait for a club member to confirm your identity.`);
				}, console.error);
			} else {
				this.mainGuild.addMember(user, {
					accessToken: userToken,
					nick: nickname,
					roles: [ this.unconfirmedRole ]
				}, console.error).then((member) => {
					this.mainChannel.send(`Please welcome <@${userId}> to the server!`);
					this.limboChannel.send(`<@${userId}>, your information has been received. Please wait for a club member to confirm your identity.`);
				}, console.error);
			}
		});
	}
	
	getAllRoles() {
		let out = [];
		for (let role of this.mainGuild.roles.values()) {
			if (role.name === '@everyone') continue;
			out.push({
				id: role.id,
				name: role.name,
				color: role.color
			});
		}
		return out;
	}

	getMembersWithRole(roleId) {
		return this.mainGuild.fetchMembers().then((guild) => {
			let output = [];
			for (let duser of guild.members.values()) {
				for (let sroleId of duser.roles.keys()) {
					if (sroleId === roleId) output.push(duser.id);
				}
			}
			return output;
		}).then((ids) => {
			let output = [];
			dbs.members.getAllItems((members) => {
				for (let id of ids) {
					output.push(members.filter(x => x.connections.discord.id === id)[0]);
				}
			});
			return output;
		});
	}

	updateMembersDrivePermissions(discordIds) {
		return drive.getDrives().then((drives) => {
			let discordMembers = [];
			for (let dmember of this.mainGuild.members.values()) {
				if (!discordIds || discordIds.find(x => x === dmember.user.id)) {
					discordMembers.push(dmember);
				}
			}
			dbs.members.getAllItems((members) => {
				for (let dmember of discordMembers) {
					dmember.realMember = members.find(x => x.connections.discord.id === dmember.id);
				}
			});
			dbs.roleExtras.getAllItems((roleExtras) => {
				let index = {};
				for (let roleExtra of roleExtras) index[roleExtra.discordId] = roleExtra;
				let permissionChanges = [];
				for (let member of discordMembers) {
					let memberPermissions = {};
					let roleIndexes = {};
					for (let role of member.roles.values()) {
						if (role.name === '@everyone') continue;
						for (let permission of roleExtras.find(x => x.discordId === role.id).googleDriveAccess) {
							if (role.position < roleIndexes[permission.fileId]) continue;
							memberPermissions[permission.fileId] = permission.access;
							roleIndexes[permission.fileId] = role.position;
						}
					}
					permissionChanges.push([member, memberPermissions]);
				}
				let timeout = 0;
				for (let change of permissionChanges) {
					let email = change[0].realMember.emailAddress;
					let domain = email.split('@')[1];
					if (domain !== 'gmail.com' && domain !== 'boscotech.net') {
						console.warn('WARNING: Email ' + email + ' does not appear to be a google or gsuite account.');
						console.warn('WARNING: Skipping setting Drive permissions for them.');
						continue;
					}
					// TODO: Change to a promise-based system that is stored outside the method so that if more changes
					// are requested, they will start after the previous ones.
					for (let tdrive of drives) {
						setTimeout(() => {
							tdrive.setRole(email, change[1][tdrive.id] || drive.ROLE_NONE);
						}, timeout);
						timeout += 250;
					}
				}
				console.log('Updating Google Drive permissions, it is scheduled to take ' + timeout + 'ms.');
			});
		});
	}
}

module.exports = DiscordBot;