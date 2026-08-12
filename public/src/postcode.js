const POSTCODE_SCRIPT = "https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
let scriptPromise;

function loadPostcodeScript() {
  if (globalThis.kakao?.Postcode) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${POSTCODE_SCRIPT}"]`);
    const script = existing || document.createElement("script");
    const finish = () => globalThis.kakao?.Postcode
      ? resolve()
      : reject(new Error("카카오 우편번호 서비스를 불러오지 못했습니다."));

    script.addEventListener("load", finish, { once: true });
    script.addEventListener("error", () => reject(new Error("인터넷 연결을 확인한 뒤 다시 시도해주세요.")), { once: true });
    if (!existing) {
      script.src = POSTCODE_SCRIPT;
      script.async = true;
      document.head.append(script);
    }
  }).catch((error) => {
    scriptPromise = undefined;
    throw error;
  });

  return scriptPromise;
}

function composeAddress(data) {
  const baseAddress = data.userSelectedType === "J"
    ? data.jibunAddress
    : (data.roadAddress || data.address);
  if (data.userSelectedType !== "R") return baseAddress;

  const extras = [];
  if (data.bname && /[동로가]$/.test(data.bname)) extras.push(data.bname);
  if (data.buildingName && data.apartment === "Y") extras.push(data.buildingName);
  return extras.length ? `${baseAddress} (${extras.join(", ")})` : baseAddress;
}

function ensureLayer() {
  let layer = document.querySelector("#kakaoPostcodeLayer");
  if (layer) return layer;

  layer = document.createElement("div");
  layer.id = "kakaoPostcodeLayer";
  layer.className = "postcode-layer";
  layer.setAttribute("role", "dialog");
  layer.setAttribute("aria-modal", "true");
  layer.setAttribute("aria-labelledby", "postcodeLayerTitle");
  layer.setAttribute("aria-hidden", "true");
  layer.innerHTML = `
    <div class="postcode-layer__panel">
      <header>
        <div><small>KAKAO POSTCODE</small><h2 id="postcodeLayerTitle">배송지 주소 찾기</h2></div>
        <button type="button" class="postcode-layer__close" aria-label="주소 검색 닫기">닫기 <span>×</span></button>
      </header>
      <p class="postcode-layer__hint">도로명, 건물명 또는 지번을 검색해주세요.</p>
      <div class="postcode-layer__embed"></div>
    </div>`;
  document.body.append(layer);
  return layer;
}

function closeLayer(layer, returnFocus) {
  layer.classList.remove("is-open");
  layer.setAttribute("aria-hidden", "true");
  document.body.classList.remove("postcode-open");
  layer.querySelector(".postcode-layer__embed").replaceChildren();
  returnFocus?.focus();
}

export async function openKakaoPostcode({ postcode, address, detail, status, trigger } = {}) {
  const fields = [postcode, address, detail];
  if (fields.some((field) => !(field instanceof HTMLInputElement))) {
    throw new Error("주소 입력 필드를 찾을 수 없습니다.");
  }

  if (status) status.textContent = "카카오 주소 검색을 불러오는 중입니다.";
  await loadPostcodeScript();

  const layer = ensureLayer();
  const embed = layer.querySelector(".postcode-layer__embed");
  const closeButton = layer.querySelector(".postcode-layer__close");
  const close = () => closeLayer(layer, trigger);

  closeButton.onclick = close;
  layer.onclick = (event) => { if (event.target === layer) close(); };
  layer.onkeydown = (event) => { if (event.key === "Escape") close(); };
  layer.classList.add("is-open");
  layer.setAttribute("aria-hidden", "false");
  document.body.classList.add("postcode-open");
  closeButton.focus();

  new globalThis.kakao.Postcode({
    oncomplete(data) {
      postcode.value = data.zonecode;
      address.value = composeAddress(data);
      postcode.dispatchEvent(new Event("input", { bubbles: true }));
      address.dispatchEvent(new Event("input", { bubbles: true }));
      closeLayer(layer);
      detail.focus();
      if (status) status.textContent = "주소를 선택했습니다. 상세 주소를 입력해주세요.";
    },
    onresize(size) {
      embed.style.height = `${Math.min(Math.max(size.height, 400), Math.max(400, window.innerHeight - 210))}px`;
    },
    width: "100%",
    height: "100%",
    maxSuggestItems: 5
  }).embed(embed);

  if (status) status.textContent = "검색할 주소를 입력해주세요.";
}

export function setAddressFieldsReadonly(form, names) {
  names.forEach((name) => {
    const field = form.elements[name];
    if (!field) return;
    field.readOnly = true;
  });
}
