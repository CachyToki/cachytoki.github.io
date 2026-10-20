"use strict";

// Profile content mirrors ../index.html. No shell commands are executed.
(() => {
  const output = document.querySelector("#output");
  const scrollback = document.querySelector("#scrollback");
  const input = document.querySelector("#command");
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
    { id: "duckduckgo", name: "DuckDuckGo", note: "Default. Uses Bing's index. Private.", url: "https://duckduckgo.com/", parameter: "q" },
    { id: "startpage", name: "Startpage", note: "A search engine from a European company. Uses Google's index. Private.", url: "https://www.startpage.com/sp/search", parameter: "query" },
    { id: "google", name: "Google", note: "It's Google. The most well-known search engine. I don't recommend it because of privacy.", url: "https://www.google.com/search", parameter: "q" },
    { id: "bing", name: "Bing", note: "A search engine by Microslo—Microsoft. I don't recommend it either because of privacy.", url: "https://www.bing.com/search", parameter: "q" },
  ];

  const devices = [
    { name: "Nothing Phone (3)", role: "Main phone", specs: { SoC: "Snapdragon 8s Gen 4", RAM: "LPDDR5X 16GB", Storage: "UFS 4.0 512GB", OS: "Nothing OS 5.0 (Android 17)", Browser: "Ironfox" } },
    { name: "Google Pixel 6a", role: "Sub phone", specs: { SoC: "Google Tensor", RAM: "LPDDR5 6GB", Storage: "UFS 3.1 128GB", OS: "LineageOS 23.2 (Android 16)", Browser: "Ironfox" } },
    { name: "Lenovo ThinkPad T14 Gen 5 (AMD)", role: "Daily use", specs: { CPU: "AMD Ryzen 7 PRO 8840U", RAM: "Kingston DDR5-5600 32GB", GPU: "AMD Radeon 780M (iGPU)", Storage: "Micron PCIe 4.0 NVMe 512GB", OS: "CachyOS (Arch-based)", Desktop: "KDE Plasma", IDE: "Zed/Neovim(Vim)", Browser: "Zen" } },
    { name: "ASUS TUF Gaming A15 (FA507)", role: "AAA & VR", specs: { CPU: "AMD Ryzen 7 6800H", RAM: "Samsung DDR5-4800 16GB", GPU: "NVIDIA GeForce RTX 3050 Laptop", Storage: "Intel PCIe 3.0 NVMe 512GB", OS: "Windows 11 (ReviOS)", Browser: "LibreWolf" } },
  ];
  const games = [
    ["01", "Blue Archive", "https://www.nexon.com/main/en/Blue%20Archive/"],
    ["02", "Arknights: Endfield", "https://endfield.gryphline.com/"],
    ["03", "Zenless Zone Zero", "https://zenless.hoyoverse.com/en/"],
    ["04", "Hot Dogs, Horseshoes & Hand Grenades (H3VR)", "https://store.steampowered.com/app/450540/"],
  ];
  const links = [
    ["twitter", "Twitter / X", "https://x.com/CachyToki3655"],
    ["youtube", "YouTube", "https://www.youtube.com/@CachyToki"],
    ["github", "GitHub", "https://github.com/CachyToki"],
    ["github_repo", "GitHub Repository", "https://github.com/CachyToki/cachytoki.github.io.git"],
    ["japanese", "日本語", "../jp/index.html"],
    ["light", "Lightweight Version", "../light.html"],
    ["database", "Database", "../database"],
    ["links", "Links", "../links"],
    ["old", "Old Design", "../old/index.html"],
    ["android", "Keep Android Open", "https://keepandroidopen.org"],
    ["home", "GUI Homepage", "../index.html"],
  ];
  const descriptions = {
    fastfetch: "A quick introduction",
    about: "A little about me",
    devices: "Daily drivers & full specs",
    games: "Games I like",
    gallery: "Four photos from my gallery",
    links: "Find me & explore the site",
    ls: "List the profile files",
    "cat <file>": "Read a .txt file (try about.txt)",
    "open <name>": "Show a link (try youtube)",
    "search [query]": "Search the web; choose an engine (default: DuckDuckGo)",
    "theme <color>": "Mocha accents: lavender, cyan, green, amber",
    typeme: "Shows surprises to you",
    ikisugi: "??? (I don't even know what is this)",
    history: "Commands from this session",
    clear: "Clear the terminal",
    help: "Show this guide",
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
    for (const [key, value] of Object.entries(values)) {
      const row = element("div");
      row.append(element("dt", key), element("dd", value));
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
      if (/Firefox\//i.test(ua)) return "Gecko (Firefox or compatible)";
      return "Gecko (browser unidentified)";
    }
    if (/AppleWebKit\//i.test(ua)) {
      if (/FxiOS\//i.test(ua)) return "WebKit (Firefox on iOS)";
      if (/CriOS\//i.test(ua)) return "WebKit (Chrome on iOS)";
      if (/EdgiOS\//i.test(ua)) return "WebKit (Edge on iOS)";
      if (/OPiOS\//i.test(ua)) return "WebKit (Opera on iOS)";
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
      return "Chromium / Blink (Chrome or compatible)";
    }
    if (/AppleWebKit\//i.test(ua)) {
      if (/Epiphany\//i.test(ua)) return "WebKit (WebKitGTK / GNOME Web)";
      if (/Safari\//i.test(ua) && /Macintosh|iPhone|iPad|iPod/i.test(ua)) return "WebKit (Safari or compatible)";
      return "WebKit (Safari / WebKitGTK or compatible)";
    }
    return "Unknown (browser does not identify its engine)";
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
    return "Unknown (browser does not identify its OS)";
  }
  function fastfetch(parent) {
    const fetch = element("div", undefined, "fetch");
    const art = element("figure", undefined, "fetch-art");
    const image = element("img");
    image.src = "./toki.png";
    image.alt = "Toki plush";
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
    line(parent, "Welcome to my website :3  Blue Archive, tech, anime and guns enthusiast. Type help to look around.", "intro");
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
    input.placeholder = choosingEngine ? "1–4, engine name, or Enter for DuckDuckGo" : "enter your search query…";
    inputHint.textContent = choosingEngine
      ? "Choose an engine. Enter = DuckDuckGo. Type cancel or press Ctrl+C to exit."
      : `Search with ${searchSession.engine.name}. Type cancel or press Ctrl+C to exit.`;
  }
  function beginSearch(query, parent) {
    searchSession = { stage: "engine", query, engine: null };
    title(parent, "Available Search Engines");
    line(parent, "Press Enter to use the default search engine, or choose a number or name.", "muted");
    const choices = element("div", undefined, "search-engines");
    searchEngines.forEach((engine, index) => {
      const button = element("button", undefined, "search-engine");
      button.type = "button";
      button.append(element("span", `${index + 1}. ${engine.name}${index === 0 ? " (Default)" : ""}`, "accent"), element("span", engine.note, "muted"));
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
    if (query) line(parent, `Query: ${query}`, "accent");
    showSearchPrompt();
  }
  function answerSearch(value, parent) {
    if (/^(cancel|exit)$/i.test(value)) {
      cancelSearch();
      line(parent, "Search cancelled.", "muted");
      return;
    }
    if (searchSession.stage === "engine") {
      const choice = value.toLowerCase();
      const engine = !choice ? searchEngines[0] : searchEngines.find((engine, index) =>
        choice === String(index + 1) || choice === engine.id || (choice === "ddg" && index === 0));
      if (!engine) {
        line(parent, "Choose 1–4 or an engine name. Press Enter for DuckDuckGo.", "error");
        return;
      }
      searchSession.engine = engine;
      searchSession.stage = "query";
      if (!searchSession.query) {
        line(parent, `${engine.name} selected. What would you like to search for?`);
        showSearchPrompt();
        return;
      }
    } else {
      if (!value) {
        line(parent, "Enter a search query, or type cancel to exit.", "error");
        return;
      }
      searchSession.query = value;
    }
    const { engine, query } = searchSession;
    const url = new URL(engine.url);
    url.searchParams.set(engine.parameter, query);
    window.open(url.href, "_blank", "noopener,noreferrer");
    line(parent, `Opening ${engine.name} results in a new tab. If nothing opens, follow the link below.`, "muted");
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
          line(result, "Hey, I'm CachyToki.");
          line(result, "Welcome to my little corner of the internet. I'm an enthusiast of Blue Archive, tech, anime and guns.");
          line(result, "Explore my daily drivers, games I like, and gallery using the commands or the file explorer.");
          line(result, "This Website made by GPT-6.1 Sol by OpenAI. which means I vibe coded this website.");
          break;
        case "devices":
          title(result, "~/cachytoki/devices.txt — Daily Drivers");
          for (const device of devices) {
            const block = element("section", undefined, "device");
            const heading = element("h3", `${device.name} `);
            heading.append(element("span", `[${device.role}]`));
            block.append(heading, facts(device.specs)); result.append(block);
          }
          break;
        case "games": title(result, "~/cachytoki/games.txt — Games I like"); linkRows(result, games); break;
        case "gallery": {
          title(result, "~/cachytoki/gallery/");
          const grid = element("div", undefined, "gallery");
          for (let i = 1; i <= 4; i++) {
            const link = element("a"); link.href = `../imgs/Gallery/${i}.webp`; link.target = "_blank"; link.rel = "noopener noreferrer";
            const image = element("img"); image.src = `../imgs/Gallery/${i}_Compressed.webp`; image.alt = `Gallery photo ${i}`; image.loading = "lazy"; image.width = 640; image.height = 360;
            link.append(image, document.createTextNode(`0${i}.webp ↗`)); grid.append(link);
          }
          result.append(grid); line(result, "Select a photo to open the full image.", "muted"); break;
        }
        case "links": title(result, "~/cachytoki/links.txt"); linkRows(result, links); break;
        case "ls":
          title(result, "~/cachytoki");
          line(result, "about.txt    devices.txt    games.txt    gallery/    links.txt");
          line(result, "Read a file with cat about.txt, or type gallery to browse photos.", "muted"); break;
        case "help": {
          title(result, "A few ways to look around");
          const list = element("dl", undefined, "command-list");
          for (const [key, description] of Object.entries(descriptions)) list.append(element("dt", key), element("dd", description));
          result.append(list);
          line(result, "Tab completes commands. ↑ / ↓ recall your history. Ctrl+L clears the screen. Ctrl+C cancels your input.", "muted");
          line(result, "This is an interactive profile in your browser. Search results and video commands open in a new tab.", "muted"); break;
        }
        case "open": {
          const match = links.find(([key]) => key === args.join(" "));
          if (match) { linkRows(result, [match]); line(result, "Follow the link above to continue.", "muted"); }
          else line(result, `Choose a destination: ${links.map(([key]) => key).join(", ")}.`, "muted");
          break;
        }
        case "typeme":
        case "ikisugi": {
          const url = command === "typeme"
            ? "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
            : "https://www.youtube.com/watch?v=MFwtpM21wWc";
          window.open(url, "_blank", "noopener,noreferrer");
          line(result, "Opening YouTube in a new tab. If nothing opens, follow the link below.", "muted");
          linkRows(result, [[command, "Watch on YouTube", url]]);
          break;
        }
        case "theme":
          if (themeColors.includes(args[0])) { setTheme(args[0]); line(result, `Theme set to Catppuccin Mocha / ${args[0]}.`, "accent"); }
          else line(result, `Usage: theme ${themeColors.join(" | ")}`, "muted");
          break;
        case "history":
          title(result, "Session history"); history.forEach((text, index) => line(result, `${String(index + 1).padStart(3, " ")}  ${text}`)); break;
        case "whoami": line(result, "visitor — welcome to CachyToki's website :3"); break;
        case "pwd": line(result, "/home/visitor/cachytoki"); break;
        case "invalid-file": line(result, `cat: ${args.join(" ") || "(missing filename)"}: no such profile file. Type ls to list files.`, "error"); break;
        default: line(result, `${name}: command not found. Type help to see available commands.`, "error");
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
      announcement.textContent = command === "clear" ? "Terminal cleared." : `${value}: ${result.textContent}`;
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
          announcement.textContent = `Completions: ${matches.join(", ")}`;
          document.querySelector("#input-hint").textContent = matches.join(" · ");
        }
      }
    } else if (event.ctrlKey && event.key.toLowerCase() === "l") {
      event.preventDefault(); cancelSearch(); run("clear");
    } else if (event.ctrlKey && event.key.toLowerCase() === "c" && input.selectionStart === input.selectionEnd) {
      event.preventDefault(); cancelSearch(); input.value = ""; historyIndex = history.length; draft = ""; announcement.textContent = "Input cancelled.";
    }
  });
  let savedTheme;
  try { savedTheme = localStorage.getItem(themeStorageKey); } catch { /* Use the default theme. */ }
  setTheme(themeColors.includes(savedTheme) ? savedTheme : "lavender");
  run("fastfetch", true);
})();
