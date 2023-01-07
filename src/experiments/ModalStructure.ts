import {
  ComponentType,
  ComponentTextInput,
  MessageInteractionContext,
  ModalInteractionContext,
  ModalOptions,
  ModalSendableContext
} from 'slash-create';

type ModalTemplate = Omit<ComponentTextInput, 'custom_id' | 'type'>;

export abstract class Modal<T extends Record<string, ModalTemplate> = {}> {
  abstract fields: T;
  abstract custom_id: string;

  title: string = this.constructor.name;

  abstract onSubmit(
    ctx: ModalInteractionContext,
    options: Partial<Record<keyof T, string>>,
    page: number
  ): void | Promise<void>;

  /**
   *
   * @param ctx The context to register against
   * @param page The page of components to render (#components / 5, default: 0)
   */
  registerOn(ctx: ModalSendableContext, page: number = 0) {
    if (!ctx.messageID) throw new Error('messageID is required on context');
    if (!Number.isInteger(page)) page = Math.round(page);

    const options: ModalOptions = {
      title: this.title,
      custom_id: this.custom_id,
      components: []
    };

    const keys = Object.keys(this.fields);
    if (page * 5 > keys.length) page = keys.length - (keys.length % 5);

    const breakpoint = Math.min(keys.length, page * 5 + 5);
    for (let index = page * 5; index < breakpoint; index++) {
      if (options.components.length >= 5) break;

      const key = keys[index];
      const field = this.fields[key];

      options.components.push({
        type: 1,
        components: [
          {
            ...field,
            type: ComponentType.TEXT_INPUT,
            custom_id: key
          }
        ]
      });
    }

    ctx.sendModal(options, (modalCtx) => {
      this.onSubmit(modalCtx, modalCtx.values as Partial<Record<keyof T, string>>, page);
    });
  }

  unregisterOn(ctx: MessageInteractionContext) {
    if (!ctx.messageID) throw new Error('messageID is required on context');

    ctx.unregisterWildcardComponent(ctx.messageID);
  }
}
