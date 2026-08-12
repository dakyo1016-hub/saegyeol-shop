import { products } from "./products.js";
import { addCartItem, initCommerceUI } from "./store.js";

const commerce = initCommerceUI(products);
const stories = {
  "soft-boundary": { meta:"COVER STORY · FASHION · 08 MIN", title:"경계가 부드러워지는 순간", deck:"시어한 소재가 만드는 여름의 새로운 레이어", image:"./assets/products/sheer-blouson-korean.webp", productIds:[1,3], body:["이번 계절의 옷은 몸을 감추거나 드러내는 일 사이에서 조금 더 자유롭습니다. 빛을 통과시키는 얇은 소재는 실루엣을 선명하게 규정하는 대신 움직임에 따라 새로운 선을 만듭니다.","시어 블루종은 단정한 셔츠와 가벼운 아우터 사이에 있습니다. 익숙한 형태와 낯선 질감의 조합 덕분에 옷장은 크게 바꾸지 않아도 오늘의 인상을 새롭게 조정할 수 있습니다."] },
  "skin-light": { meta:"BEAUTY ESSAY · SKIN · 07 MIN", title:"피부가 기억하는 빛", deck:"광택보다 오래 남는 건강한 피부의 조건", image:"./assets/products/barrier-serum-worn.webp", productIds:[2,8], body:["좋은 빛은 피부 표면에만 머물지 않습니다. 충분한 수분과 편안한 장벽에서 시작된 윤기는 표정이 움직일 때마다 자연스럽게 드러납니다.","빠르게 반짝이는 제품보다 매일 부담 없이 반복할 수 있는 루틴을 고릅니다. 세안 뒤 수분을 채우고, 건조해지기 쉬운 손까지 천천히 돌보는 작은 순서입니다."] },
  "one-shoulder": { meta:"STYLE NOTE · FASHION · 06 MIN", title:"한쪽 어깨만으로 완성되는 여름의 선", deck:"비대칭과 드레이프를 어렵지 않게 입는 법", image:"./assets/products/draped-top-worn.webp", productIds:[3,5], body:["비대칭 옷은 생각보다 조용합니다. 한쪽 어깨와 자연스럽게 흐르는 주름만으로 기본 팬츠도 충분히 새로운 비율을 갖게 됩니다.","액세서리는 최소한으로 줄이고 소재가 만드는 선을 그대로 남겨보세요. 부드러운 가방 하나면 긴장과 여유의 균형이 완성됩니다."] },
  "coral": { meta:"COLOR NOTE · BEAUTY · 04 MIN", title:"얼굴의 온도를 바꾸는 코랄 한 방울", deck:"피부 톤마다 다르게 피어나는 코랄 컬러", image:"./assets/products/lip-tint-korean.webp", productIds:[4,2], body:["코랄은 하나의 색이 아니라 피부 위에서 완성되는 온도입니다. 얇게 한 번 바르면 맑고, 여러 번 포개면 생기 있는 인상이 됩니다.","완벽하게 채우기보다 입술 안쪽부터 번지듯 바르고 경계를 손끝으로 가볍게 정리해 보세요."] },
  "bag": { meta:"BRAND NOTE · OBJECT · 08 MIN", title:"매일의 모양을 담는 검은 곡선", deck:"좋은 가방이 시간을 견디는 방식", image:"./assets/products/shoulder-bag-korean.webp", productIds:[5,7], body:["매일 드는 물건일수록 형태는 단순하고 디테일은 정확해야 합니다. 손이 닿는 스트랩, 자연스럽게 열리는 지퍼, 몸에 붙는 곡선을 오래 살펴봅니다.","유행보다 사용자의 시간을 따라가는 물건. 그것이 검은 가방 한 개를 오래 곁에 두는 이유입니다."] },
  "scent": { meta:"PEOPLE · SCENT · 09 MIN", title:"내가 나를 기억하는 가장 짧은 방법", deck:"세 사람의 향과 밤에 관한 대화", image:"./assets/products/gentle-night-perfume-worn.webp", productIds:[6,8], body:["향은 장면보다 먼저 기억을 불러옵니다. 늦은 밤의 서늘한 공기, 깨끗한 셔츠, 오래된 나무 책상 같은 이미지가 작은 분사 한 번에 되살아납니다.","누군가에게 보이기 위한 향보다 나에게 돌아오기 위한 향을 고르는 사람들의 이야기를 들었습니다."] },
  "linen": { meta:"MATERIAL NOTE · FASHION · 05 MIN", title:"구김까지 좋아지는 린넨의 계절", deck:"단정함과 느슨함 사이, 여름 재킷 이야기", image:"./assets/products/summer-half-jacket-worn.webp", productIds:[7,1], body:["린넨의 구김은 실패가 아니라 시간의 기록입니다. 앉고 걷고 소매를 접는 동안 옷은 점차 착용자의 모양을 닮아갑니다.","짧은 소매와 여유 있는 어깨의 재킷은 여름의 포멀함을 가볍게 만듭니다."] },
  "hands": { meta:"BEAUTY RITUAL · 03 MIN", title:"손끝에 남는 작고 좋은 습관", deck:"향과 보습을 한 번에 챙기는 저녁 루틴", image:"./assets/products/shell-hand-cream-korean.webp", productIds:[8,6], body:["하루 동안 가장 많은 것을 만지는 손은 쉽게 건조해집니다. 잠들기 전 향이 은은한 크림을 천천히 펴 바르는 짧은 시간이 작은 전환점이 됩니다.","손등에서 손가락 사이, 손톱 주변까지 가볍게 마사지하며 오늘을 정리해 보세요."] }
};

const toast = document.querySelector(".toast");
let toastTimer;
function showToast(message) { toast.textContent=message; toast.classList.add("show"); clearTimeout(toastTimer); toastTimer=setTimeout(()=>toast.classList.remove("show"),2200); }

const productCard = (product, compact=false) => `<article class="mag-product ${compact?"compact":""}"><a href="./product.html?id=${product.id}"><img src="${product.image}" alt="${product.name}" /></a><div><small>${product.brand}</small><a href="./product.html?id=${product.id}"><strong>${product.name}</strong></a><p>${product.price}</p><button data-mag-add="${product.id}" type="button">ADD +</button></div></article>`;
document.querySelector("#magazineProducts").innerHTML = products.slice(0,4).map((product)=>productCard(product)).join("");

document.querySelectorAll("[data-mag-filter]").forEach((button)=>button.addEventListener("click",()=>{
  document.querySelectorAll("[data-mag-filter]").forEach((item)=>item.classList.toggle("active",item===button));
  const filter=button.dataset.magFilter;
  document.querySelectorAll("[data-category]").forEach((card)=>card.classList.toggle("is-filtered",filter!=="all"&&card.dataset.category!==filter));
}));

const reader=document.querySelector(".magazine-reader");
function openStory(id){
  const story=stories[id]; if(!story)return;
  reader.querySelector(".reader-meta").textContent=story.meta;
  reader.querySelector(".reader-title").textContent=story.title;
  reader.querySelector(".reader-deck").textContent=story.deck;
  reader.querySelector(".reader-hero").src=story.image;
  reader.querySelector(".reader-hero").alt=story.title;
  reader.querySelector(".reader-body").innerHTML=story.body.map((paragraph,index)=>`<p><span>${String(index+1).padStart(2,"0")}</span>${paragraph}</p>`).join("");
  reader.querySelector(".reader-products").innerHTML=story.productIds.map((id)=>productCard(products.find((item)=>item.id===id),true)).join("");
  reader.classList.add("is-open"); reader.setAttribute("aria-hidden","false"); document.body.classList.add("panel-open"); reader.querySelector(".reader-scroll").scrollTop=0;
}
document.querySelectorAll("[data-story]").forEach((card)=>card.addEventListener("click",()=>openStory(card.dataset.story)));
document.querySelector(".reader-close").addEventListener("click",()=>{reader.classList.remove("is-open");reader.setAttribute("aria-hidden","true");document.body.classList.remove("panel-open");});
document.addEventListener("keydown",(event)=>{if(event.key==="Escape"&&reader.classList.contains("is-open"))document.querySelector(".reader-close").click();});
document.body.addEventListener("click",(event)=>{const button=event.target.closest("[data-mag-add]");if(!button)return;const product=products.find((item)=>item.id===Number(button.dataset.magAdd));addCartItem(product.id,product.options[0]);commerce.refresh();showToast(`${product.name}을 장바구니에 담았습니다.`);});

const menuToggle=document.querySelector(".menu-toggle"); const mobileMenu=document.querySelector(".mobile-menu");
menuToggle.addEventListener("click",()=>{const open=!mobileMenu.classList.contains("is-open");mobileMenu.classList.toggle("is-open",open);document.body.classList.toggle("menu-open",open);menuToggle.setAttribute("aria-expanded",String(open));});
