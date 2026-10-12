// Contract -> PDF -> share sheet. The document itself is built in
// contractHtml.js.

import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { generateContractHtml } from "@/utils/contractHtml";

export async function exportContractPdf(model) {
  const { uri } = await Print.printToFileAsync({ html: generateContractHtml(model) });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Collabnb Contract" });
  }
}
