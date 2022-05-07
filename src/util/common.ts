import { Client as ErisClient } from 'eris';
import { Permissions, SlashCreator } from 'slash-create';
import { AccessCheckOptions, User } from './types';

export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type ReplacerCondition = (key: any, value: any) => boolean;

const replacer = (conditions: ReplacerCondition[]) => (key: any, value: any) => {
  if (conditions.every(condition => condition(key, value))) {
    return value;
  }

  return undefined;
};

export const keyFilter = replacer([
  (_, value) => value instanceof ErisClient || value instanceof SlashCreator,
  (key) => ['_ctx', 'token', 'interactionToken', 'publicKey'].includes(key),
  (key) => key.startsWith('_'),
]);

export const clone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj, keyFilter));

export const checkPermissions = (options: AccessCheckOptions) => {
  const { channelEntity, targetID, permissions, action } = options;

  const overwrites = channelEntity.permissionsOf(targetID);
  const missingPermissions = new Permissions(overwrites.allow).missing(permissions);

  if (missingPermissions.length > 0) {
    const message = `It appears either you or the bot do not have the required permissions for the **${action}**.\n\n`
      + `Missing permissions: \`${missingPermissions.join(', ')}\`\n`
    throw new Error(message);
  }
}

// UserName#Discriminator (ID)

/**
 * This method originates from a tag of the same name on [blargbot](https://blargbot.xyz/).
 *
 * @param user The user to format
 * @returns The user's name and discriminator, with the ID in parentheses
 * @author sudojunior
 */
export const undi = ({username, discriminator, id}: User) => `${username}#${discriminator} (${id})`;
