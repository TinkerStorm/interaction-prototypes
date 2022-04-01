import { Client as ErisClient } from 'eris';
import { SlashCreator } from 'slash-create';

export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const replacer = (key: any, value: any) => {
  // console.log(key, value);

  if (
    value instanceof ErisClient ||
    value instanceof SlashCreator ||
    ['_ctx', 'token', 'interactionToken', 'publicKey'].includes(key) ||
    key.startsWith('_')
  ) {
    return undefined;
  }

  return value;
};

export const clone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj, replacer));
