const lavaone = require("./LavaOne");
const discord = require("./LavaOne/node_modules/discord.js");

let client = new discord.Client();
client.on("ready", async () => {
  client.music = new lavaone.LavaClient(client, [
    {
      host: "127.0.0.1",
      port: 2333,
      password: "iqcodeiq",
    },
  ]);

  client.music.on("nodeSuccess", (node) => {
    console.log(`Node connected: ${node.options.host}`);
    client.music.Spotify = new lavaone.Spotify(
      "0c18c44d0eb049839d580001b9124247",
      "c79eba7e357047c381ed9cd51b0eabe5"
    );
  });

  client.music.on("nodeError", console.error);

  setTimeout(async () => {
    let guild = await client.guilds.fetch("763754086297632778");
    let voiceChannel = await client.channels.fetch("846592625708367902");
    let textChannel = await client.channels.fetch("844824190859345931");
    let member = await guild.members.cache.get("529170389079949313");

    let player = await client.music.spawnPlayer(
      {
        guild,
        voiceChannel,
        textChannel,
        volume: 100,
        deafen: true,
      },
      {
        skipOnError: true,
      }
    );

    console.log(await client.music.Spotify.getTrack("1Cv1YLb4q0RzL6pybtaMLo"));
    let res = await player.lavaSearch(
      "https://www.youtube.com/watch?v=21qNxnCS8WU",
      member,
      {
        source: "yt",
        add: true,
      }
    );

    player.queue.add(res[0]);

    await player.play();
  }, 5000);
});

client.login("ODQ0NTE5MDYxNTgwMTUyODMy.YKTlqg.oCvCVyKrvQWO2XbIc64XPysVVMk");
