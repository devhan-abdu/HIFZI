import { callQF } from "./src/features/quran/services";

async function test() {
  console.log("Testing API...");
  try {
    const res = await callQF("/content/verses/by_page/1", {
      params: {
        translations: 131, // Default translation in store
        fields: "text_uthmani",
        per_page: 50,
      }
    });
    console.log(JSON.stringify(res, null, 2));
  } catch (e) {
    console.error(e);
  }
}

test();
