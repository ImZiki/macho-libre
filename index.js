import {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  UserSelectMenuBuilder,
} from "discord.js";
import fs from "fs";
import "dotenv/config";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

// ========== CONFIG ==========
function saveConfig(data) {
  fs.writeFileSync("config.json", JSON.stringify(data, null, 2));
}
function loadConfig() {
  if (fs.existsSync("config.json")) return JSON.parse(fs.readFileSync("config.json"));
  return { baseVcId: null };
}
let config = loadConfig();

// ========== TEMP CHANNELS ==========
const TEMP_CHANNELS = new Map(); // vcID -> { ownerID, whitelist: Set, textChannelID }

client.on("voiceStateUpdate", async (oldState, newState) => {
  if (!config.baseVcId) return;

  if (newState.channelId === config.baseVcId) {
    const owner = newState.member;
    const categoryId = newState.channel.parentId;

    const tempChannel = await newState.guild.channels.create({
      name: `Sala de ${owner.displayName}`,
      type: 2, 
      parent: categoryId,
      permissionOverwrites: [
        { id: newState.guild.id, deny: [PermissionsBitField.Flags.Connect] },
        { id: owner.id, allow: [PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.ManageChannels] },
        { id: client.user.id, allow: [PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.MoveMembers] },
      ],
    });

    TEMP_CHANNELS.set(tempChannel.id, {
      ownerID: owner.id,
      whitelist: new Set([owner.id]),
      textChannelID: null,
    });

    await owner.voice.setChannel(tempChannel).catch(console.error);
  }

  // Removing channels when empty
  if (oldState.channelId && TEMP_CHANNELS.has(oldState.channelId)) {
    const tempData = TEMP_CHANNELS.get(oldState.channelId);
    const vcChannel = oldState.channel;
    const textChannel = oldState.guild.channels.cache.get(tempData.textChannelID);

    if (vcChannel.members.size === 0) {
      TEMP_CHANNELS.delete(oldState.channelId);
      await vcChannel.delete().catch(() => {});
      if (textChannel) await textChannel.delete().catch(() => {});
    }
  }
});

// ========== Interactions ==========
client.on("interactionCreate", async (interaction) => {
  if (interaction.isButton()) {
    const tempData = Array.from(TEMP_CHANNELS.values()).find(tc => tc.textChannelID === interaction.channel.id);
    if (!tempData) return interaction.reply({ content: "❌ Este canal no es temporal.", ephemeral: true });
    if (interaction.user.id !== tempData.ownerID) return interaction.reply({ content: "❌ Solo el dueño puede usar estos botones.", ephemeral: true });

    const vcChannel = client.channels.cache.get([...TEMP_CHANNELS.entries()].find(([k, v]) => v === tempData)[0]);

    if (interaction.customId === "lock_button") {
      await vcChannel.permissionOverwrites.edit(vcChannel.guild.id, { Connect: false });
      return interaction.reply({ content: `🔒 Canal ${vcChannel.name} bloqueado.`, ephemeral: true });
    }

    if (interaction.customId === "unlock_button") {
      await vcChannel.permissionOverwrites.edit(vcChannel.guild.id, { Connect: true });
      return interaction.reply({ content: `🔓 Canal ${vcChannel.name} desbloqueado.`, ephemeral: true });
    }

    if (interaction.customId === "whitelist_button") {
      const userSelect = new UserSelectMenuBuilder()
        .setCustomId("whitelist_user_select")
        .setPlaceholder("Selecciona usuarios")
        .setMinValues(1)
        .setMaxValues(5);

      const row = new ActionRowBuilder().addComponents(userSelect);
      return interaction.reply({ content: "Selecciona los usuarios a añadir:", components: [row], ephemeral: true });
    }
  }

  if (interaction.isUserSelectMenu() && interaction.customId === "whitelist_user_select") {
    const tempData = Array.from(TEMP_CHANNELS.values()).find(tc => tc.textChannelID === interaction.channel.id);
    if (!tempData) return interaction.reply({ content: "❌ Este canal no es temporal.", ephemeral: true });

    const vcChannel = client.channels.cache.get([...TEMP_CHANNELS.entries()].find(([k, v]) => v === tempData)[0]);

    for (const user of interaction.users.values()) {
      await vcChannel.permissionOverwrites.edit(user.id, { Connect: true });
      tempData.whitelist.add(user.id);
    }

    return interaction.update({ content: `✅ ${interaction.users.size} usuarios añadidos a la whitelist.`, components: [] });
  }
});

// ========== REGISTRO DE COMANDOS ==========
client.on("clientReady", async () => {
  const commands = [
    new SlashCommandBuilder()
      .setName("setupbase")
      .setDescription("Crea el canal base para generar salas temporales")
      .addChannelOption(option =>
        option.setName("categoria")
              .setDescription("Categoría donde se creará el canal base")
              .setRequired(true)
              .addChannelTypes(4)
      ),
    new SlashCommandBuilder()
      .setName("lockvc")
      .setDescription("Bloquea el canal temporal para todos."),
    new SlashCommandBuilder()
      .setName("unlockvc")
      .setDescription("Desbloquea el canal temporal para todos."),
    new SlashCommandBuilder()
      .setName("whitelistvc")
      .setDescription("Abre un selector para añadir usuarios a la whitelist.")
  ];

  const guildId = process.env.GUILD_ID; // reemplaza por tu servidor
  const guild = client.guilds.cache.get(guildId);
  if (guild) {
    await guild.commands.set(commands);
    console.log("✅ Comandos registrados en el servidor");
  } else {
    console.log("❌ No se encontró la guild");
  }
});

client.login(process.env.BOT_TOKEN);
