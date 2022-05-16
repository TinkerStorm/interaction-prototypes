# interaction-prototypes

Deception is a bot made as a prototype to manage game lobbies for community servers. It's extended goal is to provide a stepping stone to play the game of Mafia or Werwolf through interactions, and lay the foundations for others to build upon.

> Generated from `slash-create-template` using [`slash-up`](https://github.com/Snazzah/slash-up).

## [Game lobby handler](./src/util/game.ts) ([Video](./assets/lobby-interaction-demo.mp4))

- Lobby names use the NATO phonetic alphabet.
- `#initialRoster` will clone itself before being used for rendering the list of players. Since it uses 3 inline fields to render the list, it will determine where each player goes - for mobile compatibility, it will render the numbers vertically.
  > Originally it was intended to use `index % 3` but it now uses `index / 3` to ensure numbers are grouped together.
- It will not allow players to join the lobby if it is full, and it will not allow the host to leave the lobby.
- Components will enable themselves once their condition has been met.

## Progress updates ([Project board](https://github.com/orgs/TinkerStorm/projects/5/views/1))

- Christmas weekend
  - [Dec 25th 2021 - Lobby posts](https://twitter.com/SudoJunior/status/1474858833818357761)
  - [Dec 26th 2021 - Channel creation](https://twitter.com/SudoJunior/status/1475215703515054083)
  - [Dec 28th 2021 - Join requests and cleanup](https://twitter.com/SudoJunior/status/1475898353473011715)
- [Apr 2nd 2022 - Vote mockup](https://twitter.com/TinkerStorm/status/1510042509321379842)
- [May 7th 2022 - Full automation](https://twitter.com/TinkerStorm/status/1523051267454824448) - #2
  - [May 10th 2022 - Ephemeral setup wizard](https://twitter.com/TinkerStorm/status/1523806105117376512) - #10

## License

This project is licensed under the [GNU General Public License v3.0](https://choosealicense.com/licenses/gpl-3.0). See the [LICENSE](LICENSE) file for more information.
