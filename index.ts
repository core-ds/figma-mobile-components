import path from "path";
import fs from "fs";
import { promisify } from "util";
import libraries from "./data/libraries.json";
import {
  requestComponents,
  requestStyles,
  downloadImage,
  variantsAdapter,
  nameAdapter,
  chunkArray,
} from "./utils";
import axios from "axios";

const writeFile = promisify(fs.writeFile);

const buildItem = (
  component: FigmaItem,
  libraryName: string,
  platform: Platform
) => {
  const isVariant = !!component.containing_frame?.containingStateGroup;

  const item: ShortFigmaItem = {
    key: component.key,
    file_key: component.file_key,
    library_name: libraryName,
    name: isVariant
      ? component.containing_frame.containingStateGroup.name
      : component.name,
    description: component.description,
    platform,
  };

  if (isVariant) {
    item.variant = component.name;
  }

  return item;
};

const filterItems = (component: ShortFigmaItem) => {
  const name = component.name.toLocaleLowerCase().trim();

  return (
    name.startsWith(".") === false && name.includes("deprecated") === false
  );
};

const findPairs = async (components: ShortFigmaItem[]) => {
  const r = await axios.get("https://design.alfabank.ru/figma-pairs/pairs");
  const keys = r.data.toString();

  const byPlatform = {
    IOS: components.filter((c) => c.platform === "IOS"),
    ANDROID: components.filter((c) => c.platform === "ANDROID"),
  };

  const match = (c1: ShortFigmaItem, c2: ShortFigmaItem) => {
    const c1Name = nameAdapter(c1.name);
    const c2Name = nameAdapter(c2.name);
    const c1Variant = variantsAdapter(c1.variant);
    const c2Variant = variantsAdapter(c2.variant);

    if (c1Variant && c2Variant) {
      return c1Name === c2Name && c1Variant === c2Variant;
    }

    if (!c1Variant && !c2Variant) {
      return c1Name === c2Name;
    }
  };

  const newPairs: Array<[ShortFigmaItem, ShortFigmaItem]> = [];

  for (const ios of byPlatform.IOS) {
    let matched = false;

    for (const android of byPlatform.ANDROID) {
      matched = match(ios, android);
      if (matched && !keys.includes(ios.key) && !keys.includes(android.key)) {
        newPairs.push([ios, android]);
        break;
      }
    }

    if (matched) continue;
  }

  for await (const [c1, c2] of newPairs) {
    await axios.post("https://design.alfabank.ru/figma-pairs/link", {
      key1: c1.key,
      key2: c2.key,
    });
    console.log(`[+] autolink: ${c1.name}:${c1.key} <-> ${c2.name}:${c2.key}`);
  }
};

(async () => {
  const allComponents: ShortFigmaItem[] = [];

  for (let platform of Object.keys(libraries) as Platform[]) {
    console.log(`\n[~] Start parsing ${platform}`);

    for (let library of libraries[platform]) {
      console.log(`\n[~] Start parsing ${library.name}`);

      try {
        const response =
          library.type === "typography"
            ? await requestStyles(library.file_key)
            : await requestComponents(library.file_key);

        allComponents.push(
          ...response
            .map<ShortFigmaItem>((component) =>
              buildItem(component, library.name, platform)
            )
            .filter(filterItems)
        );

        console.log(`[+] ${library.file_key} saved`);

        await chunkArray(response, 50).map((chunk) =>
          Promise.all(
            chunk.map(async (style) => {
              const dest = path.resolve(__dirname, "data/images");

              await downloadImage(style.thumbnail_url, `${style.key}.png`, dest)
                .then((saved: boolean) => {
                  if (saved) {
                    console.log(`[+] ${style.name}:${style.key} saved`);
                  }
                })
                .catch((err) => {
                  console.error(
                    `[-] ${style.name}:${style.key}: ${err.message}`
                  );
                });
            })
          )
        );
      } catch (e) {
        console.log(e);
      }
    }
  }

  allComponents.sort((a, b) =>
    `${a.name}: ${a.description}`.localeCompare(`${b.name}: ${b.description}`)
  );

  console.log(`\n[~] Saving components...`);

  const componentsFileName = path.resolve(__dirname, "./data/components.json");
  await writeFile(
    componentsFileName,
    JSON.stringify(allComponents, null, 4),
    "UTF-8"
  );

  try {
    await findPairs(allComponents);
  } catch (e) {
    console.log(`[!] ${e.message}`);
  }
})();
