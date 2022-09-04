import { chromium } from "playwright-chromium";
import { Window } from "happy-dom";
import { DefaultDict, wrapError } from "./utils";

async function main() {
  const rawUrl = process.argv[2];
  const url = wrapError(() => new URL(rawUrl ?? ""));
  if (!url.ok) {
    console.error("ERROR: invalid url", rawUrl);
    return;
  }

  const browser = await chromium.launch({ headless: !process.env["HEADED"] });
  const page = await browser.newPage();
  await page.goto(url.value.href);

  // start cdp
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");

  // get all nodes
  const { root: document } = await cdp.send("DOM.getDocument");
  const { nodeIds } = await cdp.send("DOM.querySelectorAll", {
    nodeId: document.nodeId,
    selector: "*",
  });
  console.error({ nodeIds });

  // collect font usage from all nodes
  const stats = DefaultDict(() => DefaultDict(() => Array<number>())); // isCustomFont => familyName => nodeIds

  for (const nodeId of nodeIds) {
    const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", {
      nodeId,
    });
    for (const font of fonts) {
      stats[String(font.isCustomFont)]?.[font.familyName]?.push(nodeId);
    }
  }
  console.error({ stats });

  // collect potential texts with `isCustomFont = false`
  for (const [familyName, nodeIds] of Object.entries(stats["false"] ?? {})) {
    console.log({ familyName });

    for (const nodeId of nodeIds) {
      const { outerHTML } = await cdp.send("DOM.getOuterHTML", { nodeId });
      const text = getContentText(outerHTML);
      console.log({ text });
      console.error({ nodeId, outerHTML, text });

      // TODO: highlight node with `isCustomFont = false`
      const { quads } = await cdp.send("DOM.getContentQuads", { nodeId });
      console.error({ nodeId, quads });
    }
  }

  await browser.close();
}

function getContentText(html: string): string {
  const window = new Window();
  const document = window.document;
  document.body.innerHTML = html;
  return document.body.textContent;
}

if (require.main === module) {
  main();
}
