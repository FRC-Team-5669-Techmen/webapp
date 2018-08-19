const rawDiscord = require('./rawDiscord');
const discord = require('discord.js');
const dbs = require('./databases');

const CLIENT_DATA = require('../private/discord-app-data.json');
const BOT_TOKEN = CLIENT_DATA.botToken;
const MAIN_GUILD = CLIENT_DATA.botGuild;
const MAIN_CHANNEL = CLIENT_DATA.botChannel;
const LEAD_ROLES = CLIENT_DATA.leadRoles;
const CONFIRMED_ROLE = CLIENT_DATA.confirmedRole;
const UNCONFIRMED_ROLE = CLIENT_DATA.unconfirmedRole;

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
			this.confirmedRole = this.mainGuild.roles.get(CONFIRMED_ROLE);
			this.unconfirmedRole = this.mainGuild.roles.get(UNCONFIRMED_ROLE);
		});
		this.client.on('message', (message) => this.onMessage(message));
		this.client.on('error', console.error);
		this.client.on('rateLimit', console.error);
		this.client.login(BOT_TOKEN);
		DiscordBot.instance = this;
	}

	onMessage(message) {
		console.log(message.content);
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
				DiscordBot.instance.mainChannel.send('This is another test.');
			}
		}
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
}

module.exports = DiscordBot;