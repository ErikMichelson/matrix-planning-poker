import 'i18next';

declare module 'i18next' {
  interface CustomTypeOptions {
    // configure the typings of i18next to always return `string`
    returnNull: false;
  }
}
