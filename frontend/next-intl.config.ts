import { getRequestConfig } from 'next-intl/server';
import { getMessages } from './src/i18n/request';

export default getRequestConfig(async ({ requestLocale }) => {
  // This is the Pages Router approach where requestLocale might be undefined
  const locale = await requestLocale || 'en';
  
  // Get messages for the locale from your API
  const messages = await getMessages(locale);

  return {
    locale,
    messages,
  };
});