import { SlashCreator } from "slash-create";

import acceptComponent from "./accept";
import declineComponent from "./decline";
import deleteComponent from "./delete";
import joinComponent from "./join";
import leaveComponent from "./leave";
import newGameComponent from "./new-game";
import toggleAccessComponent from "./toggle-access";

export enum ComponentKeys {
  ACCEPT = 'accept',
  DECLINE = 'decline',
  DELETE = 'delete',
  JOIN = 'join',
  LEAVE = 'leave',
  NEW_GAME = 'new-game',
  TOGGLE_ACCESS = 'toggle-access'
}

const components = {
  [ComponentKeys.ACCEPT]: acceptComponent,
  [ComponentKeys.DECLINE]: declineComponent,
  [ComponentKeys.DELETE]: deleteComponent,
  [ComponentKeys.JOIN]: joinComponent,
  [ComponentKeys.LEAVE]: leaveComponent,
  [ComponentKeys.NEW_GAME]: newGameComponent,
  [ComponentKeys.TOGGLE_ACCESS]: toggleAccessComponent
};

export function registerComponents(creator: SlashCreator) {
  for (const [id, component] of Object.entries(components)) {
    creator.registerGlobalComponent(id, (ctx) => component(ctx, creator.client));
  }
}
