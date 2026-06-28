import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://esvrhnlwquunsdduvbnr.supabase.co";
const SUPABASE_SERVICE_KEY = "sb_publishable_jbVlP7sXJ3TmGM-njwZ2Jw_KN2yUEt1";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const question = {
  id: "che-2015-obj-0004",
  subject: "chemistry",
  year: 2015,
  category: "objective",
  question: "How would you prepare 250𝑐𝑚3 𝑜𝑓 0.25𝑀 aqueous solution of 𝑁𝑎𝐶𝑙? [𝑁𝑎= 23𝑔𝑚𝑜𝑙−1; 𝐶𝑙 = 35.5𝑔𝑚𝑜𝑙−1]",
  options: [
    { label: "A", text: "Add 3.66𝑔 𝑁𝑎𝐶𝑙 𝑡𝑜 250𝑐𝑚3 of distilled water" },
    { label: "B", text: "Weigh 3.66𝑔 𝑁𝑎𝐶𝑙 𝑖𝑛𝑡𝑜 250𝑚𝑙 flask and add distilled water up to the mark" },
    { label: "C", text: "Add 14.60𝑔 𝑁𝑎𝐶𝑙 𝑡𝑜 250𝑐𝑚3 of distilled water" },
    { label: "D", text: "Weigh 14.60𝑔 𝑁𝑎𝐶𝑙 𝑖𝑛𝑡𝑜 250𝑚𝑙 flask and add distilled water up to the mark" }
  ],
  correct_answer: null,
  explanation: null,
  difficulty: "medium"
};

const { data, error } = await supabase
  .from("study_questions")
  .upsert(question, { onConflict: "id" });

if (error) {
  console.error("Error:", error.message);
} else {
  console.log("Updated che-2015-obj-0004 successfully");
}
