import JSON5 from 'json5';


export const extractTag = (text: string, tag: string) => {
  const regex = new RegExp(`<${tag}>(.*?)</${tag}>`, "s");
  const match = text.match(regex);
  return match ? match[1].trim() : null;
};

export const removeTag = (text: string, tag: string) => {
  const regex = new RegExp(`<${tag}>(.*?)</${tag}>`, "s");
  return text.replace(regex, "").trim();
}

export const extractCodeBlock = (text: string, lang: string) => {
  const codeBlockRegex = new RegExp(
    `\`\`\`${lang}\\s*([\\s\\S]*?)\\s*\`\`\``,
    "m",
  );
  const codeBlockMatch = text.match(codeBlockRegex);
  return codeBlockMatch ? codeBlockMatch[1].trim() : null;
};


export const safeJSONParse = (text: string) => {
  try {
    return JSON5.parse(text);
  } catch (error) {
    console.error('Error parsing JSON:', error);
    try {
      // replace line breaks in json with "\n"
      const cleanedText = text
        .replace(/(?<=[\"\,\]\[\{\}])\n/g, '')
        .replace(/\n/g, '\\n');
      return JSON5.parse(cleanedText);
    } catch (error) {
      console.error('Error parsing JSON:', error);
      throw error;
    }
  }
};