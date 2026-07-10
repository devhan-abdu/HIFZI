import { callQF } from "./src/features/quran/services";

async function test() {
  try {
    const res = await callQF("/content/verses/by_page/1", {
      params: {
        translations: 131, 
        fields: "text_uthmani",
        per_page: 50,
      }
    });
  } catch (e) {
    console.error(e);
  }
}

test();
