const fs = require("fs");

const components = JSON.parse(
  fs.readFileSync("./data/components_old.json", "utf8")
);

components.forEach((component) => {
  const imagePath = `./data/images/${component.key}.png`;
  if (fs.existsSync(imagePath)) {
    fs.rmSync(imagePath);
    console.log(`Removed ${imagePath}`);
  }
});

// const replacements = JSON.parse(
//   fs.readFileSync("./replacements.json", "utf-8")
// );
// const pairs = JSON.parse(fs.readFileSync("./pairs.json", "utf-8"));

// const newPairs = [];

// pairs.forEach((pair) => {
//   const newPair = [];

//   if (pair[0] in replacements) {
//     console.log(`${pair[0]} -> ${replacements[pair[0]]}`);
//     newPair.push(replacements[pair[0]]);
//   }

//   if (pair[1] in replacements) {
//     console.log(`${pair[1]} -> ${replacements[pair[1]]}`);
//     newPair.push(replacements[pair[1]]);
//   }

//   if (newPair.length === 2) {
//     newPairs.push(newPair);
//   }
// });

// fs.writeFileSync("./pairs_new.json", JSON.stringify(newPairs, null, 4));

// const oldC = JSON.parse(fs.readFileSync("./data/components_old.json", "utf-8"));
// const newC = JSON.parse(fs.readFileSync("./data/components.json", "utf-8"));

// const dict = {};
// const notFound = [];
// oldC.forEach((o) => {
//   newC.forEach((n) => {
//     if (
//       `${o.name}|${o.platform}|${o.variant}` ===
//       `${n.name}|${n.platform}|${n.variant}`
//     ) {
//       dict[o.key] = n.key;
//     }
//   });

//   if (!dict[o.key]) {
//     notFound.push(o);
//   }
// });

// fs.writeFileSync('./replacements.json', JSON.stringify(dict, null, 2));
