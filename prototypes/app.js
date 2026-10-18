const QUESTIONS = [
  {
    author: "Anonymous",
    age: "2m",
    text: "Can I ask a question without creating an account?",
    votes: 42,
    hot: true,
  },
  {
    author: "Maya",
    age: "8m",
    text: "How do we pin the question being answered right now?",
    votes: 27,
    hot: false,
  },
  {
    author: "Anonymous",
    age: "14m",
    text: "Will upvotes reorder the list live for everyone?",
    votes: 19,
    hot: false,
  },
];

const COPY = {
  a: {
    brand: "Signal",
    hostTitle: "Run the room",
    hostSub: "Create a session, share a code, highlight what you are answering.",
    partTitle: "Ask anything",
    partSub: "Join with a code. Stay anonymous. Upvote what matters.",
  },
  b: {
    brand: "Open Floor",
    hostTitle: "Moderate the floor",
    hostSub: "Approve, highlight, mark answered. Keep the thread readable.",
    partTitle: "Take the floor",
    partSub: "Type a question. Vote. Follow the highlighted thread.",
  },
  c: {
    brand: "Room<span><em>.</em>ask</span>",
    hostTitle: "Host console",
    hostSub: "Session #ROOM42 · 38 people · live",
    partTitle: "Audience Q&A",
    partSub: "You are in #ROOM42 as a guest.",
  },
};

function cardsHtml(variant) {
  return QUESTIONS.map((q) => {
    const hot = q.hot ? " hot" : "";
    const chip =
      variant === "c" && q.hot ? `<span class="chip">answering</span>` : "";
    return `
      <article class="card${hot}">
        <div class="meta"><span>${q.author} · ${q.age}</span>${chip}</div>
        <p class="q">${q.text}</p>
        <div class="vote">▲ ${q.votes}</div>
      </article>`;
  }).join("");
}

function render(variant) {
  const c = COPY[variant];
  const stage = document.getElementById("stage");
  stage.dataset.variant = variant;

  const brand =
    variant === "c"
      ? `<div class="brand">${c.brand}</div>`
      : `<div class="brand">${c.brand}</div>`;

  const hostExtras =
    variant === "c"
      ? `<div class="code-pill"># ROOM42 <button class="btn ghost" type="button">Copy</button></div>
         <div class="actions">
           <button class="btn" type="button">Highlight</button>
           <button class="btn ghost" type="button">Mark answered</button>
           <button class="btn ghost" type="button">Close asking</button>
         </div>`
      : `<div class="join">
           <span>#</span>
           <input value="ROOM42" readonly />
           <button type="button">Share</button>
         </div>
         <div class="row">
           <button class="btn" type="button">Highlight</button>
           <button class="btn ghost" type="button">Mark answered</button>
         </div>`;

  const joinPart =
    variant === "c"
      ? `<div class="code-pill">Joined as guest</div>`
      : `<div class="join">
           <span>#</span>
           <input placeholder="enter code" value="ROOM42" />
           <button type="button">Join</button>
         </div>`;

  const askBtnClass = variant === "b" ? "btn fill" : "btn";

  stage.innerHTML = `
    <div class="shell">
      <section class="panel host">
        <div class="panel-label">Host</div>
        ${brand}
        <h2 class="headline">${c.hostTitle}</h2>
        <p class="sub">${c.hostSub}</p>
        ${hostExtras}
        <div class="board">${cardsHtml(variant)}</div>
      </section>
      <section class="panel participant">
        <div class="panel-label">Participant</div>
        ${brand}
        <h2 class="headline">${c.partTitle}</h2>
        <p class="sub">${c.partSub}</p>
        ${joinPart}
        <div class="board">${cardsHtml(variant)}</div>
        <div class="ask">
          <textarea placeholder="Ask a question (anonymous by default)"></textarea>
          <div class="row">
            <button class="${askBtnClass}" type="button">Ask anonymously</button>
            <button class="btn ghost" type="button">Use my name</button>
          </div>
        </div>
      </section>
    </div>`;
}

function setActive(variant) {
  document.querySelectorAll(".switcher button").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.variant === variant);
  });
  render(variant);
}

document.querySelectorAll(".switcher button").forEach((btn) => {
  btn.addEventListener("click", () => setActive(btn.dataset.variant));
});

window.addEventListener("keydown", (e) => {
  if (e.key === "1") setActive("a");
  if (e.key === "2") setActive("b");
  if (e.key === "3") setActive("c");
});

setActive("a");
