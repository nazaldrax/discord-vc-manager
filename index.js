const { Client, GatewayIntentBits, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ]
});


// Configuration
const config = {
  token: 'YOUR_BOT_TOKEN_HERE',
  creationChannelID: 'YOUR_CREATION_CHANNEL_ID', 
  categoryID: 'YOUR_CATEGORY_ID', 
  controlPanelChannelID: 'YOUR_CONTROL_PANEL_CHANNEL_ID' 
};


const vcOwners = new Map();

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('voiceStateUpdate', async (oldState, newState) => {
 
  if (newState.channelId === config.creationChannelID && !oldState.channelId) {
    const member = newState.member;
    const guild = newState.guild;
    
    try {
      
      const newChannel = await guild.channels.create({
        name: `${member.user.username}'s VC`,
        type: 2, 
        parent: config.categoryID,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionsBitField.Flags.Connect]
          },
          {
            id: member.id,
            allow: [
              PermissionsBitField.Flags.Connect,
              PermissionsBitField.Flags.ManageChannels,
              PermissionsBitField.Flags.MoveMembers
            ]
          }
        ]
      });
      
      // Move the member to the new channel
      await member.voice.setChannel(newChannel);
      
     
      vcOwners.set(newChannel.id, member.id);
      
      
      await createControlPanel(newChannel, member);
    } catch (error) {
      console.error('Error creating VC:', error);
    }
  }
  
  
  if (oldState.channel && oldState.channel.parentId === config.categoryID && oldState.channel.id !== config.creationChannelID) {
    if (oldState.channel.members.size === 0) {
      vcOwners.delete(oldState.channel.id);
      await oldState.channel.delete().catch(console.error);
    }
  }
});

async function createControlPanel(channel, owner) {
  const controlPanelChannel = await client.channels.fetch(config.controlPanelChannelID);
  if (!controlPanelChannel) return;
  
  const embed = new EmbedBuilder()
    .setTitle(`Voice Channel Control Panel - ${channel.name}`)
    .setDescription(`Owner: <@${owner.id}>\nChannel: <#${channel.id}>`)
    .setColor('#0099ff');
  
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`kick_${channel.id}`)
      .setLabel('Kick Member')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`mute_${channel.id}`)
      .setLabel('Mute Member')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`unmute_${channel.id}`)
      .setLabel('Unmute Member')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`lock_${channel.id}`)
      .setLabel('Lock VC')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`unlock_${channel.id}`)
      .setLabel('Unlock VC')
      .setStyle(ButtonStyle.Secondary)
  );
  
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`transfer_${channel.id}`)
      .setLabel('Transfer Ownership')
      .setStyle(ButtonStyle.Primary)
  );
  
  await controlPanelChannel.send({
    embeds: [embed],
    components: [row, row2]
  });
}

client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;
  
  const [action, channelId] = interaction.customId.split('_');
  const channel = await client.channels.fetch(channelId);
  const ownerId = vcOwners.get(channelId);
  
  
  if (interaction.user.id !== ownerId) {
    return interaction.reply({ content: 'Only the VC owner can use this control panel.', ephemeral: true });
  }
  
  try {
    switch (action) {
      case 'kick':
       
        await interaction.reply({ content: 'Use the select menu to choose a member to kick.', ephemeral: true });
        break;
        
      case 'mute':
       
        await interaction.reply({ content: 'Use the select menu to choose a member to mute.', ephemeral: true });
        break;
        
      case 'unmute':
       
        await interaction.reply({ content: 'Use the select menu to choose a member to unmute.', ephemeral: true });
        break;
        
      case 'lock':
        await channel.permissionOverwrites.edit(interaction.guild.id, {
          Connect: false
        });
        await interaction.reply({ content: 'Channel locked!', ephemeral: true });
        break;
        
      case 'unlock':
        await channel.permissionOverwrites.edit(interaction.guild.id, {
          Connect: null 
        });
        await interaction.reply({ content: 'Channel unlocked!', ephemeral: true });
        break;
        
      case 'transfer':
        
        await interaction.reply({ content: 'Use the select menu to choose a new owner.', ephemeral: true });
        break;
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
    await interaction.reply({ content: 'An error occurred while processing your request.', ephemeral: true });
  }
});

client.login(config.token);