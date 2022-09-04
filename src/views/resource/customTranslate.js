import translations from "./translationsCn";
export default function customTranslate(template, replacements) {
  replacements = replacements || {};
  console.log("key:", template);
  // Translate
  template = translations[template] || template;
  console.log("value:", template);

  // Replace
  return template.replace(/{([^}]+)}/g, function(_, key) {
    return replacements[key] || "{" + key + "}";
  });
}
