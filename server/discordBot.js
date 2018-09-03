const rawDiscord = require('./rawDiscord');
const discord = require('discord.js');
const dbs = require('./databases');

const CLIENT_DATA = require('../private/discord-app-data.json');
const BOT_TOKEN = CLIENT_DATA.botToken;
const MAIN_GUILD = CLIENT_DATA.botGuild;
const MAIN_CHANNEL = CLIENT_DATA.botChannel;
const LEAD_ROLES = CLIENT_DATA.leadRoles;

class DiscordBot {
	constructor() {
		this.client = new discord.Client();
		
		this.client.on('ready', () => {
			console.log('Bot connected!');
			this.mainGuild = this.client.guilds.get(MAIN_GUILD);
			this.mainChannel = this.client.channels.get(MAIN_CHANNEL);
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
				this.mainChannel.send('This is another test.');
			} else if (command === 'confirm') {
				if (args.length !== 1) {
					message.channel.send('Usage: !confirm [@username#nmbr]');
					return;
				} else {
					let userId = args[0];
					if (userId[0] === '<' && userId[1] === '@') {
						userId = userId.slice(3).slice(0, -1);
						this.confirm(userId);
						message.channel.send(args[0] + ' is now confirmed.');
					} else {
						message.channel.send('Usage: !confirm [@username#nmbr]')
					}
				}
			}
		}
	}

	confirm(userId) {
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
				roles.push(this.teamRoles[member.team]);
				console.log(roles);
				member.addRoles(roles).catch(console.error);
				member.removeRole(this.unconfirmedRole);
			});
		});
	}

	makeLeader(userId) {
		dbs.members.getAllItems((members) => {
			let found = null;
			for (let member of members) {
				if (member.connections.discord.id === userId) {
					found = member;
					break;
				}
			}
			if (found.accessLevel !== 'leader') {
				found.accessLevel = 'leader';
			} else {
				return;
			}
			this.client.fetchUser(userId).then((user) => {
				return this.mainGuild.fetchMember(user);
			}).then((member) => {
				member.addRole(this.leaderRole);
			});
		});
	}

	revokeLeader(userId) {
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
				return;
			}
			this.client.fetchUser(userId).then((user) => {
				return this.mainGuild.fetchMember(user);
			}).then((member) => {
				member.removeRole(this.leaderRole);
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
					this.mainChannel.send(`Please welcome <@${userId}> to the server!\n\nAn admin must confirm they are an actual club member by typing **!confirm <@${userId}>**`);
				}, console.error);
			} else {
				this.mainGuild.addMember(user, {
					accessToken: userToken,
					nick: nickname,
					roles: [ this.unconfirmedRole ]
				}, console.error).then((member) => {
					this.mainChannel.send(`Please welcome <@${userId}> to the server!\n\nAn admin must confirm they are an actual club member by typing **!confirm <@${userId}>**`);
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

	updateDrivePermissions() {
		let users = [];
		this.mainGuild.fetchMembers().then((res) => {
			for (let member of res.members) {
				member = member[1];
				let user = member.user;
				users.push({
					id: user.id,
					name: user.username,
					roles: member._roles,
					realname: member.nickname || user.username
				});
			}
			console.log(users);
		});
	}
}

module.exports = DiscordBot;