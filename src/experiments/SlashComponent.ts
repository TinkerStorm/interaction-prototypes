import { ComponentContext, SlashCreator } from 'slash-create';

import { ComponentListener, MethodDictionary } from '../util/types';

/**
 * Unused, type experiment. There are better ways to do this.
 */
export default class SlashComponent<Methods extends MethodDictionary> {
  _predicate: ComponentListener<Methods, boolean>;
  _run: ComponentListener<Methods, void>;
  _methods: { [key: string]: (...args: any[]) => any } = {};

  constructor(public id: string, methods?: Methods) {
    this._methods = methods ?? {};
  }

  withPredicate(predicate: ComponentListener<Methods, boolean>) {
    this._predicate = predicate;
    return this;
  }

  withMethod<Key extends string, Method extends (...args: any[]) => any>(
    key: Key,
    method: Method
  ): SlashComponent<Methods & { [key in Key]: Method }> {
    this._methods[key] = method;
    return this as any as SlashComponent<Methods & { [key in Key]: Method }>;
  }

  withMethods<T extends MethodDictionary>(methods: T): SlashComponent<Methods & T> {
    this._methods = { ...this._methods, ...methods };
    return this as any as SlashComponent<Methods & T>;
  }

  runWith(run: ComponentListener<Methods, void>) {
    this._run = run;
    return this;
  }

  public register(creator: SlashCreator) {
    const methods = this._methods;

    creator.registerGlobalComponent(this.id, async (ctx: ComponentContext) => {
      if (this._predicate && !(await this._predicate(ctx, creator.client, methods as Methods))) return;

      await this._run(ctx, creator.client, methods as Methods);
    });
  }
}
