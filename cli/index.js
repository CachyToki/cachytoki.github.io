"use strict";

// Profile content mirrors ../index.html. No shell commands are executed.
(() => {
  function detectLanguage(browser = navigator) {
    const preferred = browser.languages?.[0] || browser.language || "en";
    return /^ja(?:-|$)/i.test(preferred) ? "ja" : "en";
  }
  const language = detectLanguage();
  const t = (english, japanese) => language === "ja" ? japanese : english;
  document.documentElement.lang = language;
  if (language === "ja") {
    for (const [attribute, target] of [["data-ja", "textContent"], ["data-ja-label", "aria-label"], ["data-ja-content", "content"], ["data-ja-href", "href"]]) {
      document.querySelectorAll(`[${attribute}]`).forEach((node) => {
        if (target === "textContent") node.textContent = node.getAttribute(attribute);
        else node.setAttribute(target, node.getAttribute(attribute));
      });
    }
  }
  const output = document.querySelector("#output");
  const scrollback = document.querySelector("#scrollback");
  const input = document.querySelector("#command");
  input.placeholder = t("type a command…", "コマンドを入力…");
  const announcement = document.querySelector("#announcement");
  const inputHint = document.querySelector("#input-hint");
  const defaultHintNodes = [...inputHint.childNodes];
  const defaultPlaceholder = input.placeholder;
  const history = [];
  let historyIndex = 0;
  let draft = "";
  const themeColors = ["lavender", "cyan", "green", "amber"];
  // Separate Mocha preferences from the previous terminal palette.
  const themeStorageKey = "cachytoki-terminal-mocha-accent";
  let searchSession = null;
  const searchEngines = [
    { id: "duckduckgo", name: "DuckDuckGo", note: t("Default. Uses Bing's index. Private.", "既定の検索エンジン。Bingのインデックスを利用。プライバシー重視。"), url: "https://duckduckgo.com/", parameter: "q" },
    { id: "startpage", name: "Startpage", note: t("A search engine from a European company. Uses Google's index. Private.", "欧州企業の検索エンジン。Googleのインデックスを利用。プライバシー重視。"), url: "https://www.startpage.com/sp/search", parameter: "query" },
    { id: "google", name: "Google", note: t("It's Google. The most well-known search engine. I don't recommend it because of privacy.", "おなじみのGoogle。最も有名な検索エンジンですが、プライバシーの観点からおすすめしません。"), url: "https://www.google.com/search", parameter: "q" },
    { id: "bing", name: "Bing", note: t("A search engine by Microslo—Microsoft. I don't recommend it either because of privacy.", "マイクロスロ……Microsoftの検索エンジン。こちらもプライバシーの観点からおすすめしません。"), url: "https://www.bing.com/search", parameter: "q" },
  ];

  const devices = [
    { name: "Nothing Phone (3)", role: t("Main phone", "メインのスマートフォン"), specs: { SoC: "Snapdragon 8s Gen 4", RAM: "LPDDR5X 16GB", Storage: "UFS 4.0 512GB", OS: "Nothing OS 5.0 (Android 17)", Browser: "Ironfox" } },
    { name: "Google Pixel 6a", role: t("Sub phone", "サブのスマートフォン"), specs: { SoC: "Google Tensor", RAM: "LPDDR5 6GB", Storage: "UFS 3.1 128GB", OS: "LineageOS 23.2 (Android 16)", Browser: "Ironfox" } },
    { name: "Lenovo ThinkPad T14 Gen 5 (AMD)", role: t("Daily use", "普段使い"), specs: { CPU: "AMD Ryzen 7 PRO 8840U", RAM: "Kingston DDR5-5600 32GB", GPU: "AMD Radeon 780M (iGPU)", Storage: "Micron PCIe 4.0 NVMe 512GB", OS: "CachyOS (Arch-based)", Desktop: "KDE Plasma", IDE: "Zed/Neovim(Vim)", Browser: "Zen" } },
    { name: "Custom Build PC", role: t("Gaming", "ゲーミング"), specs: { Chassis: "Antec P30 Air", MotherBoard: "ASRock B850 Challenger WiFi", CPU: "AMD Ryzen 9700X", RAM: "Patriot Viper Venom DDR5-6000 CL30 32GB(16x2)", GPU: "ASRock Challenger Radeon RX 9060 XT 16GB OC", Storage: "Biwin NV7400 PCIe 4.0 NVMe 1TB & Patriot P300 PCIe 3.0 NVME 512GB", OS: "Windows 11 (ReviOS)", Browser: "Zen" } },
  ];
  const games = [
    ["01", t("Blue Archive", "ブルーアーカイブ"), "https://www.nexon.com/main/en/Blue%20Archive/"],
    ["02", t("Arknights: Endfield", "アークナイツ：エンドフィールド"), "https://endfield.gryphline.com/"],
    ["03", t("Zenless Zone Zero", "ゼンレスゾーンゼロ"), "https://zenless.hoyoverse.com/en/"],
    ["04", "Hot Dogs, Horseshoes & Hand Grenades (H3VR)", "https://store.steampowered.com/app/450540/"],
  ];
  const links = [
    ["twitter", "Twitter / X", "https://x.com/CachyToki3655"],
    ["youtube", "YouTube", "https://www.youtube.com/@CachyToki"],
    ["github", "GitHub", "https://github.com/CachyToki"],
    ["github_repo", t("GitHub Repository", "GitHubリポジトリ"), "https://github.com/CachyToki/cachytoki.github.io.git"],
    ["japanese", "日本語", "../jp/index.html"],
    ["light", t("Lightweight Version", "軽量版"), t("../light.html", "../jp/light.html")],
    ["database", t("Database", "データベース"), "../database"],
    ["links", t("Links", "リンク集"), "../links"],
    ["old", t("Old Design", "旧デザイン"), "../old/index.html"],
    ["android", "Keep Android Open", "https://keepandroidopen.org"],
    ["home", t("GUI Homepage", "GUIホームページ"), t("../index.html", "../jp/index.html")],
  ];
  const descriptions = {
    fastfetch: t("your info(from User Agent)", "あなたの情報(UA取得)"),
    about: t("A little about me", "自己紹介"),
    devices: t("Daily drivers & full specs", "愛用デバイスと詳しいスペック"),
    games: t("Games I like", "好きなゲーム"),
    gallery: t("Four photos from my gallery", "ギャラリーの写真4枚"),
    links: t("Find me & explore the site", "SNSとサイト内のリンク"),
    ls: t("List the profile files", "プロフィールのファイル一覧を表示"),
    "cat <file>": t("Read a .txt file (try about.txt)", ".txtファイルを表示（例：cat about.txt）"),
    "open <name>": t("Show a link (try youtube)", "リンクを表示（例：open youtube）"),
    "search [query]": t("Search the web; choose an engine (default: DuckDuckGo)", "検索エンジンを選んでウェブを検索（既定：DuckDuckGo）"),
    "theme <color>": t("Mocha accents: lavender, cyan, green, amber", "Mochaのアクセント色：lavender、cyan、green、amber"),
    typeme: t("Shows surprises to you", "ちょっとしたサプライズ"),
    ikisugi: t("??? (I don't even know what is this)", "？？？（自分でも何なのかわかりません）"),
    "sudo <command>": t("Try to run a command as root", "rootとしてコマンドの実行を試みる"),
    su: t("Try to switch to root", "rootへの切り替えを試みる"),
    history: t("Commands from this session", "このセッションのコマンド履歴"),
    clear: t("Clear the terminal", "ターミナルの出力を消去"),
    help: t("Show this guide", "使い方を表示"),
  };
  const commands = [...Object.keys(descriptions).map((name) => name.split(" ")[0]), "whoami", "pwd"];
  const fileCommands = { "about.txt": "about", "devices.txt": "devices", "games.txt": "games", "links.txt": "links" };

  // All visitor input is rendered as text, never interpreted as markup or code.
  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function facts(values) {
    const list = element("dl", undefined, "facts");
    const labels = {
      Engine: t("Engine", "エンジン"), Storage: t("Storage", "ストレージ"),
      Browser: t("Browser", "ブラウザー"), Desktop: t("Desktop", "デスクトップ"),
    };
    for (const [key, value] of Object.entries(values)) {
      const row = element("div");
      row.append(element("dt", labels[key] || key), element("dd", value));
      list.append(row);
    }
    return list;
  }
  function title(parent, text) { parent.append(element("h2", text, "output-title")); }
  function line(parent, text, className = "output-text") { parent.append(element("p", text, className)); }
  function linkRows(parent, rows) {
    for (const [key, text, href] of rows) {
      const row = element("div", undefined, "output-link");
      const link = element("a", `${text} ↗`);
      link.href = href;
      if (href.startsWith("https://")) { link.target = "_blank"; link.rel = "noopener noreferrer"; }
      row.append(element("span", key), link);
      parent.append(row);
    }
  }
  function prompt(text) {
    const node = element("div", undefined, "command-echo");
    node.append(element("span", "visitor", "prompt-user"), element("span", "@", "muted"), element("span", "cachytoki", "prompt-host"), element("span", ":~", "muted"), element("span", "❯", "prompt-symbol"), document.createTextNode(text));
    return node;
  }
  function detectBrowserEngine(browser = navigator) {
    const ua = browser.userAgent || "";
    const brands = browser.userAgentData?.brands || [];
    // Identify engine tokens before browser names: Chromium also says
    // "AppleWebKit" and "like Gecko", and iOS browser brands can use WebKit.
    if (/Gecko\/\d/i.test(ua) && /rv:/i.test(ua)) {
      if (/SeaMonkey\//i.test(ua)) return "Gecko (SeaMonkey)";
      if (/Firefox\//i.test(ua)) return t("Gecko (Firefox or compatible)", "Gecko（Firefoxまたは互換ブラウザー）");
      return t("Gecko (browser unidentified)", "Gecko（ブラウザー不明）");
    }
    if (/AppleWebKit\//i.test(ua)) {
      if (/FxiOS\//i.test(ua)) return t("WebKit (Firefox on iOS)", "WebKit（iOS版Firefox）");
      if (/CriOS\//i.test(ua)) return t("WebKit (Chrome on iOS)", "WebKit（iOS版Chrome）");
      if (/EdgiOS\//i.test(ua)) return t("WebKit (Edge on iOS)", "WebKit（iOS版Edge）");
      if (/OPiOS\//i.test(ua)) return t("WebKit (Opera on iOS)", "WebKit（iOS版Opera）");
    }
    if (brands.some(({ brand }) => brand === "Chromium") || /(?:Chrome|Chromium|HeadlessChrome)\//i.test(ua)) {
      const knownBrands = [
        ["Microsoft Edge", "Edge"], ["Opera", "Opera"],
        ["Brave", "Brave"], ["Vivaldi", "Vivaldi"], ["Google Chrome", "Chrome"],
      ];
      for (const [brand, name] of knownBrands) {
        if (brands.some((entry) => entry.brand === brand)) return `Chromium / Blink (${name})`;
      }
      if (/Edg(?:A)?\//i.test(ua)) return "Chromium / Blink (Edge)";
      if (/OPR\//i.test(ua)) return "Chromium / Blink (Opera)";
      if (/Vivaldi\//i.test(ua)) return "Chromium / Blink (Vivaldi)";
      return t("Chromium / Blink (Chrome or compatible)", "Chromium / Blink（Chromeまたは互換ブラウザー）");
    }
    if (/AppleWebKit\//i.test(ua)) {
      if (/Epiphany\//i.test(ua)) return t("WebKit (WebKitGTK / GNOME Web)", "WebKit（WebKitGTK / GNOME Web）");
      if (/Safari\//i.test(ua) && /Macintosh|iPhone|iPad|iPod/i.test(ua)) return t("WebKit (Safari or compatible)", "WebKit（Safariまたは互換ブラウザー）");
      return t("WebKit (Safari / WebKitGTK or compatible)", "WebKit（Safari / WebKitGTKまたは互換ブラウザー）");
    }
    return t("Unknown (browser does not identify its engine)", "不明（ブラウザーからエンジン情報を取得できません）");
  }
  function detectOperatingSystem(browser = navigator) {
    const ua = browser.userAgent || "";
    const platform = browser.platform || "";
    // iPadOS can identify itself as a Mac when requesting desktop sites.
    if (/iPad/i.test(ua) || (/Macintosh|MacIntel/i.test(`${ua} ${platform}`) && browser.maxTouchPoints > 1)) return "iPadOS";
    if (/iPhone|iPod/i.test(ua)) return "iOS";
    const platforms = {
      Windows: "Windows", macOS: "macOS", Linux: "Linux",
      Android: "Android", "Chrome OS": "ChromeOS", "Chromium OS": "ChromeOS", iOS: "iOS",
    };
    const reportedPlatform = browser.userAgentData?.platform;
    if (Object.hasOwn(platforms, reportedPlatform)) return platforms[reportedPlatform];
    // Android includes "Linux", so check it before the desktop Linux fallback.
    if (/Android/i.test(ua)) return "Android";
    if (/CrOS/i.test(ua)) return "ChromeOS";
    const identity = `${ua} ${platform}`;
    if (/Windows|Win32|Win64|WOW64/i.test(identity)) return "Windows";
    if (/Macintosh|Mac OS X|MacIntel/i.test(identity)) return "macOS";
    for (const os of ["FreeBSD", "OpenBSD", "NetBSD"]) {
      if (identity.toLowerCase().includes(os.toLowerCase())) return os;
    }
    if (/Linux/i.test(identity)) return "Linux";
    return t("Unknown (browser does not identify its OS)", "不明（ブラウザーからOS情報を取得できません）");
  }
  function fastfetch(parent) {
    const fetch = element("div", undefined, "fetch");
    const art = element("figure", undefined, "fetch-art");
    const image = element("img");
    image.src = "./toki.png";
    image.alt = t("Toki plush", "トキのぬいぐるみ");
    image.width = 1662;
    image.height = 2217;
    art.append(image, element("figcaption"));
    const profile = element("div");
    profile.append(element("h1", "visitor@cachy-Web"), element("div", undefined, "fetch-rule"));
    profile.append(facts({ Engine: detectBrowserEngine(), OS: detectOperatingSystem(), }));
    const palette = element("div", undefined, "palette");
    palette.setAttribute("aria-hidden", "true");
    for (const color of ["var(--red)", "var(--yellow)", "var(--green)", "var(--sky)", "var(--blue)", "var(--mauve)", "var(--lavender)", "var(--text)"]) {
      const swatch = element("span"); swatch.style.setProperty("--swatch", color); palette.append(swatch);
    }
    profile.append(palette);
    fetch.append(art, profile);
    parent.append(fetch);
    line(parent, t("Welcome to my website :3  Blue Archive, tech, anime and guns enthusiast. Type help to look around.", "ウェブサイトへようこそ :3 ブルーアーカイブ、テクノロジー、アニメ、銃が好きです。help を入力して探索してみてください。"), "intro");
  }
  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    document.querySelector("#theme-name").textContent = `mocha / ${theme}`;
    try { localStorage.setItem(themeStorageKey, theme); } catch { /* Storage may be unavailable. */ }
  }
  function cancelSearch() {
    searchSession = null;
    input.placeholder = defaultPlaceholder;
    inputHint.replaceChildren(...defaultHintNodes);
  }
  function showSearchPrompt() {
    const choosingEngine = searchSession.stage === "engine";
    input.placeholder = choosingEngine ? t("1–4, engine name, or Enter for DuckDuckGo", "1〜4・検索エンジン名を入力／EnterでDuckDuckGo") : t("enter your search query…", "検索キーワードを入力…");
    inputHint.textContent = choosingEngine
      ? t("Choose an engine. Enter = DuckDuckGo. Type cancel or press Ctrl+C to exit.", "検索エンジンを選択。EnterでDuckDuckGo。cancel または Ctrl+C で終了。")
      : t(`Search with ${searchSession.engine.name}. Type cancel or press Ctrl+C to exit.`, `${searchSession.engine.name}で検索します。cancel または Ctrl+C で終了。`);
  }
  function beginSearch(query, parent) {
    searchSession = { stage: "engine", query, engine: null };
    title(parent, t("Available Search Engines", "利用できる検索エンジン"));
    line(parent, t("Press Enter to use the default search engine, or choose a number or name.", "Enterで既定の検索エンジンを使用します。番号または名前でも選べます。"), "muted");
    const choices = element("div", undefined, "search-engines");
    searchEngines.forEach((engine, index) => {
      const button = element("button", undefined, "search-engine");
      button.type = "button";
      button.append(element("span", `${index + 1}. ${engine.name}${index === 0 ? t(" (Default)", "（既定）") : ""}`, "accent"), element("span", engine.note, "muted"));
      // Ignore choices from old menus after this search has ended or advanced.
      const session = searchSession;
      button.addEventListener("click", () => {
        if (searchSession !== session || session.stage !== "engine") return;
        run(String(index + 1));
        input.value = "";
        if (searchSession) input.focus({ preventScroll: true });
      });
      choices.append(button);
    });
    parent.append(choices);
    if (query) line(parent, t(`Query: ${query}`, `検索キーワード：${query}`), "accent");
    showSearchPrompt();
  }
  function answerSearch(value, parent) {
    if (/^(cancel|exit)$/i.test(value)) {
      cancelSearch();
      line(parent, t("Search cancelled.", "検索をキャンセルしました。"), "muted");
      return;
    }
    if (searchSession.stage === "engine") {
      const choice = value.toLowerCase();
      const engine = !choice ? searchEngines[0] : searchEngines.find((engine, index) =>
        choice === String(index + 1) || choice === engine.id || (choice === "ddg" && index === 0));
      if (!engine) {
        line(parent, t("Choose 1–4 or an engine name. Press Enter for DuckDuckGo.", "1〜4または検索エンジン名を入力してください。EnterでDuckDuckGoを選びます。"), "error");
        return;
      }
      searchSession.engine = engine;
      searchSession.stage = "query";
      if (!searchSession.query) {
        line(parent, t(`${engine.name} selected. What would you like to search for?`, `${engine.name}を選びました。何を検索しますか？`));
        showSearchPrompt();
        return;
      }
    } else {
      if (!value) {
        line(parent, t("Enter a search query, or type cancel to exit.", "検索キーワードを入力してください。cancel で終了します。"), "error");
        return;
      }
      searchSession.query = value;
    }
    const { engine, query } = searchSession;
    const url = new URL(engine.url);
    url.searchParams.set(engine.parameter, query);
    window.open(url.href, "_blank", "noopener,noreferrer");
    line(parent, t(`Opening ${engine.name} results in a new tab. If nothing opens, follow the link below.`, `${engine.name}の検索結果を新しいタブで開きます。開かない場合は下のリンクを選んでください。`), "muted");
    linkRows(parent, [[engine.name, query, url.href]]);
    cancelSearch();
  }
  function run(raw, initial = false) {
    const value = raw.trim();
    const answeringSearch = Boolean(searchSession) && !initial;
    if (!value && !answeringSearch) return;
    if (!initial && !answeringSearch) {
      history.push(value);
      if (history.length > 100) history.shift();
    }
    historyIndex = history.length;
    draft = "";
    const [name, ...args] = value.toLowerCase().split(/\s+/);
    let command = answeringSearch ? "search-input" : name;
    if (!answeringSearch && name === "cat") command = fileCommands[args.join(" ")] || "invalid-file";
    let entry = element("section", undefined, "command-entry");
    entry.append(prompt(value));
    const result = element("div");
    entry.append(result);
    if (command === "clear") {
      output.replaceChildren();
    } else {
      switch (command) {
        case "search": beginSearch(value.replace(/^\S+\s*/, ""), result); break;
        case "search-input": answerSearch(value, result); break;
        case "fastfetch": fastfetch(result); break;
        case "about":
          title(result, "~/cachytoki/about.txt");
          line(result, t("Hey, I'm CachyToki.", "こんにちは、CachyTokiです。"));
          line(result, t("Welcome to my little corner of the internet. I'm an enthusiast of Blue Archive, tech, anime and guns.", "インターネットの片隅へようこそ。ブルーアーカイブ、テクノロジー、アニメ、銃が好きです。"));
          line(result, t("Explore my daily drivers, games I like, and gallery using the commands or the file explorer.", "コマンドやエクスプローラーから、愛用デバイス、好きなゲーム、ギャラリーをご覧ください。"));
          line(result, t("This Website made by GPT-6.1 Sol by OpenAI. which means I vibe coded this website.", "このウェブサイトはOpenAIのGPT-6.1 Solを使って作りました。いわゆるバイブコーディングです。"));
          break;
        case "devices":
          title(result, t("~/cachytoki/devices.txt — Daily Drivers", "~/cachytoki/devices.txt — 愛用デバイス"));
          for (const device of devices) {
            const block = element("section", undefined, "device");
            const heading = element("h3", `${device.name} `);
            heading.append(element("span", `[${device.role}]`));
            block.append(heading, facts(device.specs)); result.append(block);
          }
          break;
        case "games": title(result, t("~/cachytoki/games.txt — Games I like", "~/cachytoki/games.txt — 好きなゲーム")); linkRows(result, games); break;
        case "gallery": {
          title(result, "~/cachytoki/gallery/");
          const grid = element("div", undefined, "gallery");
          for (let i = 1; i <= 4; i++) {
            const link = element("a"); link.href = `../imgs/Gallery/${i}.webp`; link.target = "_blank"; link.rel = "noopener noreferrer";
            const image = element("img"); image.src = `../imgs/Gallery/${i}_Compressed.webp`; image.alt = t(`Gallery photo ${i}`, `ギャラリーの写真${i}`); image.loading = "lazy"; image.width = 640; image.height = 360;
            link.append(image, document.createTextNode(`0${i}.webp ↗`)); grid.append(link);
          }
          result.append(grid); line(result, t("Select a photo to open the full image.", "写真を選ぶと元のサイズで開きます。"), "muted"); break;
        }
        case "links": title(result, "~/cachytoki/links.txt"); linkRows(result, links); break;
        case "ls":
          title(result, "~/cachytoki");
          line(result, "about.txt    devices.txt    games.txt    gallery/    links.txt");
          line(result, t("Read a file with cat about.txt, or type gallery to browse photos.", "cat about.txt でファイルを表示、gallery で写真を閲覧できます。"), "muted"); break;
        case "help": {
          title(result, t("A few ways to look around", "使い方のヒント"));
          const list = element("dl", undefined, "command-list");
          for (const [key, description] of Object.entries(descriptions)) list.append(element("dt", key), element("dd", description));
          result.append(list);
          line(result, t("Tab completes commands. ↑ / ↓ recall your history. Ctrl+L clears the screen. Ctrl+C cancels your input.", "Tabでコマンドを補完、↑ / ↓ で履歴を表示。Ctrl+Lで画面を消去、Ctrl+Cで入力をキャンセルします。"), "muted");
          line(result, t("This is an interactive profile in your browser. Search results and video commands open in a new tab.", "ブラウザー上の対話型プロフィールです。検索結果や動画コマンドは新しいタブで開きます。"), "muted"); break;
        }
        case "open": {
          const match = links.find(([key]) => key === args.join(" "));
          if (match) { linkRows(result, [match]); line(result, t("Follow the link above to continue.", "上のリンクから移動できます。"), "muted"); }
          else line(result, t(`Choose a destination: ${links.map(([key]) => key).join(", ")}.`, `移動先を選んでください：${links.map(([key]) => key).join("、")}`), "muted");
          break;
        }
        case "typeme":
        case "ikisugi": {
          const url = command === "typeme"
            ? "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
            : "https://www.youtube.com/watch?v=MFwtpM21wWc";
          window.open(url, "_blank", "noopener,noreferrer");
          line(result, t("Opening YouTube in a new tab. If nothing opens, follow the link below.", "YouTubeを新しいタブで開きます。開かない場合は下のリンクを選んでください。"), "muted");
          linkRows(result, [[command, t("Watch on YouTube", "YouTubeで見る"), url]]);
          break;
        }
        case "theme":
          if (themeColors.includes(args[0])) { setTheme(args[0]); line(result, t(`Theme set to Catppuccin Mocha / ${args[0]}.`, `テーマをCatppuccin Mocha / ${args[0]}に設定しました。`), "accent"); }
          else line(result, t(`Usage: theme ${themeColors.join(" | ")}`, `使い方：theme ${themeColors.join(" | ")}`), "muted");
          break;
        case "sudo":
        case "su":
          if (command === "sudo") line(result, t("visitor is not in the sudoers file. This incident will be reported.", "visitor は sudoers ファイルに登録されていません。このインシデントは報告されます。"), "output-text error");
          line(result, t("the owner said this: Well well, You can't type sudo or getting any root privileges here. just use at your own terminal if you on Linux, BSD, Mac or something Unix-like operating system. and Windows user, Please install WSL2 or Switch to Linux. Nice try.", "サイト管理者より：おやおや、ここではsudoを使ったりroot権限を取得したりすることはできません。Linux、BSD、MacなどのUnix系OSをお使いなら、ご自身のターミナルでどうぞ。Windowsユーザーの方は、WSL2をインストールするかLinuxへ乗り換えてみてください。残念でした。"));
          break;
        case "history":
          title(result, t("Session history", "セッションの履歴")); history.forEach((text, index) => line(result, `${String(index + 1).padStart(3, " ")}  ${text}`)); break;
        case "whoami": line(result, t("visitor — welcome to CachyToki's website :3", "visitor — CachyTokiのウェブサイトへようこそ :3")); break;
        case "pwd": line(result, "/home/visitor/cachytoki"); break;
        case "invalid-file": line(result, t(`cat: ${args.join(" ") || t("(missing filename)", "（ファイル名が未指定）")}: no such profile file. Type ls to list files.`, `cat: ${args.join(" ") || "（ファイル名が未指定）"}：プロフィールのファイルが見つかりません。ls で一覧を表示できます。`), "error"); break;
        default: line(result, t(`${name}: command not found. Type help to see available commands.`, `${name}：コマンドが見つかりません。help で利用できるコマンドを確認してください。`), "error");
      }
      output.append(entry);
      // Bound the DOM for long sessions while retaining the latest results.
      while (output.children.length > 50) output.firstElementChild.remove();
    }
    document.querySelectorAll(".sidebar [data-command]").forEach((button) => {
      if (button.dataset.command === command) button.setAttribute("aria-current", "true");
      else button.removeAttribute("aria-current");
    });
    if (!initial) {
      announcement.textContent = command === "clear" ? t("Terminal cleared.", "ターミナルを消去しました。") : `${value}: ${result.textContent}`;
      // Keep the beginning of long output visible, rather than jumping to its end.
      if (entry.isConnected) scrollback.scrollTop = entry.offsetTop - scrollback.offsetTop - 12;
      else scrollback.scrollTop = 0;
    }
  }
  document.querySelector("#command-form").addEventListener("submit", (event) => {
    event.preventDefault(); run(input.value); input.value = "";
  });
  document.querySelectorAll("[data-command]").forEach((button) => {
    button.addEventListener("click", () => {
      cancelSearch();
      run(button.dataset.command); input.value = "";
      // Avoid opening the software keyboard when a touch visitor uses a shortcut.
      if (matchMedia("(pointer: fine)").matches) input.focus({ preventScroll: true });
    });
  });
  input.addEventListener("keydown", (event) => {
    if (event.isComposing) return;
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      if (historyIndex === history.length) draft = input.value;
      historyIndex = Math.max(0, Math.min(history.length, historyIndex + (event.key === "ArrowUp" ? -1 : 1)));
      input.value = historyIndex === history.length ? draft : history[historyIndex];
      input.setSelectionRange(input.value.length, input.value.length);
    } else if (event.key === "Tab" && !event.shiftKey && input.value.trim() && !searchSession) {
      const text = input.value.toLowerCase();
      const parts = text.split(/\s+/);
      let candidates = commands;
      if (parts.length === 2) {
        if (parts[0] === "cat") candidates = Object.keys(fileCommands).map((key) => `cat ${key}`);
        else if (parts[0] === "open") candidates = links.map(([key]) => `open ${key}`);
        else if (parts[0] === "theme") candidates = themeColors.map((key) => `theme ${key}`);
        else candidates = [];
      }
      const matches = candidates.filter((candidate) => candidate.startsWith(text));
      if (matches.length) {
        event.preventDefault();
        if (matches.length === 1) input.value = matches[0];
        else {
          input.value = matches.reduce((prefix, candidate) => {
            while (!candidate.startsWith(prefix)) prefix = prefix.slice(0, -1);
            return prefix;
          });
          announcement.textContent = t(`Completions: ${matches.join(", ")}`, `補完候補：${matches.join("、")}`);
          document.querySelector("#input-hint").textContent = matches.join(" · ");
        }
      }
    } else if (event.ctrlKey && event.key.toLowerCase() === "l") {
      event.preventDefault(); cancelSearch(); run("clear");
    } else if (event.ctrlKey && event.key.toLowerCase() === "c" && input.selectionStart === input.selectionEnd) {
      event.preventDefault(); cancelSearch(); input.value = ""; historyIndex = history.length; draft = ""; announcement.textContent = t("Input cancelled.", "入力をキャンセルしました。");
    }
  });
  let savedTheme;
  try { savedTheme = localStorage.getItem(themeStorageKey); } catch { /* Use the default theme. */ }
  setTheme(themeColors.includes(savedTheme) ? savedTheme : "lavender");
  run("fastfetch", true);
})();
