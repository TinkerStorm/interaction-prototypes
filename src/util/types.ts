import { ComponentContext, Permissions, User as SlashUser } from "slash-create";
import { Client as ErisClient, GuildChannel, User as ErisUser } from "eris";

// replacement interface for Eris.FileOptions
export interface FileAttachment {
  file: Buffer;
  name: string;
}

export type File = FileAttachment;

export type PromisableCallback<Args extends any[], Result> = (...args: Args) => Result | Promise<Result>;

export type ComponentListener<Methods extends MethodDictionary, ReturnType = any> =
  PromisableCallback<[context: ComponentContext, client: ErisClient, methods: Methods], ReturnType>

export type MethodDictionary = Record<string, (...args: any[]) => any>;

export interface SetupOptions {
  lobby_channel: string;
  lobby_category: string;
  skip_confirm?: boolean;
}

export interface AccessCheckOptions {
  channelEntity: GuildChannel;
  targetID: string;
  permissions: Permissions;
  action: string;
}

// type union for slash-create and eris, conflict resolution
export type User = SlashUser | ErisUser;

export interface LobbyOptions {
  channelID: string; // lobby channel
  categoryID: string; // lobby category
  gamePromptID: string; // new game message
}
