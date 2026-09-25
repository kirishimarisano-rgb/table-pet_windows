// =============================================================
// 摸頭偵測：滑鼠（沒按住）在角色上半身左右來回移動 4 次以上 = 摸摸頭
// =============================================================

export function setupPetting(target: HTMLElement, onPet: () => void): void {
  let lastX: number | null = null;
  let lastDir = 0;
  let turns = 0;
  let firstTurnAt = 0;
  let cooldownUntil = 0;

  target.addEventListener("pointermove", (e) => {
    if (e.buttons !== 0) return; // 按著滑鼠是拖曳，不是摸頭
    const rect = target.getBoundingClientRect();
    if (e.clientY > rect.top + rect.height * 0.6) return; // 只算上半身（頭）
    if (lastX === null) { lastX = e.clientX; return; }

    const dx = e.clientX - lastX;
    if (Math.abs(dx) < 3) return;
    lastX = e.clientX;
    const dir = Math.sign(dx);
    if (dir !== lastDir) {
      const now = Date.now();
      if (turns === 0 || now - firstTurnAt > 1500) { turns = 0; firstTurnAt = now; }
      turns++;
      lastDir = dir;
      if (turns >= 4 && now > cooldownUntil) {
        turns = 0;
        cooldownUntil = now + 4000; // 摸完休息一下，避免一直觸發
        onPet();
      }
    }
  });
  target.addEventListener("pointerleave", () => { lastX = null; turns = 0; });
}
