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

function DiscordBot() { 
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
	console.log(this.client.guilds.first(10))
	
	this.client.login(BOT_TOKEN);
	DiscordBot.instance = this;
}

DiscordBot.prototype.onMessage = function(message) {
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

DiscordBot.prototype.setupUser = function(userId, userToken, nickname) {
	let user = this.client.fetchUser(userId);
	this.mainGuild.addMember(user, {
		accessToken: userToken,
		nick: nickname,
		roles: [ this.unconfirmedRole ]
	}).then((member) => {
		this.mainChannel.send(`Please welcome <@${userId}> to the server!\n\nAn admin must confirm they are an actual club member by typing \`!confirm <@${userId}>\`.)`);
	})
}

module.exports = DiscordBot;