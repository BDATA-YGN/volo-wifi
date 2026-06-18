export const snakeToCamel = (obj: Record<string, any>): Record<string, any> => {
    const newObject: Record<string, any> = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        newObject[camelKey] = obj[key];
      }
    }
    return newObject;
  };
  