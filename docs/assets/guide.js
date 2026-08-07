/*
 * OnBook 가이드 문서 공통 스크립트
 *
 * docs/ 의 가이드 5종이 함께 사용한다. 각 문서의 <body> 끝에서 읽어들이므로
 * DOM 이 모두 준비된 상태로 실행된다.
 *
 * 해당 마크업이 없는 문서에서는 각 기능이 조용히 아무 일도 하지 않는다.
 */
(function () {
  "use strict";

  // ─── 주소에 ?tester 파라미터가 있으면 테스터 전용 요소(.tester-only) 표시 ───
  if (new URLSearchParams(location.search).has("tester")) {
    document.body.classList.add("tester-mode");
  }

  // ─── 고정 헤더·푸터 높이를 CSS 변수(--header-h, --footer-h)에 반영 ───
  var headerEl = document.querySelector(".header");
  var footerEl = document.querySelector(".footer");

  function setBarHeights() {
    if (headerEl) {
      document.documentElement.style.setProperty("--header-h", headerEl.offsetHeight + "px");
    }
    if (footerEl) {
      // 가로 스크롤바가 있으면 그 높이만큼 사이드바가 밀려 올라가므로 footer 높이에 합산해 보정
      var hScrollbar = Math.max(0, window.innerHeight - document.documentElement.clientHeight);
      document.documentElement.style.setProperty(
        "--footer-h",
        footerEl.offsetHeight + hScrollbar + "px",
      );
    }
  }
  window.addEventListener("resize", setBarHeights);
  setBarHeights();

  // ─── 좁은 화면: 햄버거 메뉴로 사이드바 열고 닫기 ───
  var menuToggle = document.querySelector(".menu-toggle");
  var backdrop = document.querySelector(".backdrop");

  function closeMenu() {
    document.body.classList.remove("menu-open");
    if (menuToggle) menuToggle.setAttribute("aria-expanded", "false");
  }

  if (menuToggle) {
    menuToggle.addEventListener("click", function () {
      var open = document.body.classList.toggle("menu-open");
      menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }
  if (backdrop) backdrop.addEventListener("click", closeMenu);
  window.addEventListener("resize", function () {
    if (window.innerWidth > 768) closeMenu();
  });

  // ─── 사이드바 카테고리 펼침/닫힘 (페이지 진입 시 항상 펼침) ───
  document.querySelectorAll(".sidebar .nav-group").forEach(function (group) {
    var btn = group.querySelector(".nav-title");
    if (btn) {
      btn.addEventListener("click", function () {
        group.classList.toggle("collapsed");
      });
    }
  });

  // ─── 목차 하이라이트 ───
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.sidebar a[href^="#"]'));
  var targets = navLinks
    .map(function (link) {
      return document.getElementById(link.getAttribute("href").slice(1));
    })
    // 숨겨진 절(테스터 전용 등)은 하이라이트 대상에서 제외
    .filter(function (el) {
      return el && el.offsetParent !== null;
    });
  var clicking = false;

  function setActive(id) {
    navLinks.forEach(function (link) {
      link.classList.toggle("active", link.getAttribute("href") === "#" + id);
    });
  }

  function updateActiveByScroll() {
    if (clicking || !targets.length) return;
    // 화면 위쪽 1/4 지점을 기준선으로, 그 선을 지난 마지막 절을 활성화
    var threshold = window.innerHeight * 0.25;
    var current = targets[0];
    targets.forEach(function (el) {
      if (el.getBoundingClientRect().top <= threshold) current = el;
    });
    // 페이지 맨 아래에 도달하면 마지막 절 활성화
    if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 2) {
      current = targets[targets.length - 1];
    }
    if (current) setActive(current.id);
  }

  window.addEventListener("scroll", updateActiveByScroll, { passive: true });
  window.addEventListener("resize", updateActiveByScroll);
  updateActiveByScroll();

  // ─── 문서 내 앵커: 세로로만 스크롤 (가로 스크롤 위치 유지) + 고정 헤더만큼 보정 ───
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (e) {
      var href = link.getAttribute("href") || "";
      var id = href.slice(1);
      var target = id ? document.getElementById(id) : null;
      if (target) {
        e.preventDefault();
        var headerH = headerEl ? headerEl.offsetHeight : 0;
        window.scrollTo(
          window.scrollX,
          target.getBoundingClientRect().top + window.scrollY - headerH - 8,
        );
        history.replaceState(null, "", href);
        setActive(id);
        // 스크롤이 멎을 때까지 하이라이트가 튀지 않도록 잠시 자동 갱신을 멈춘다
        clicking = true;
        setTimeout(function () {
          clicking = false;
        }, 800);
      }
      closeMenu();
    });
  });

  // ─── 이미지 클릭 시 원본 크기로 보기 (라이트박스) ───
  var lightbox = document.createElement("div");
  lightbox.className = "lightbox";
  var lightboxStage = document.createElement("span");
  lightboxStage.className = "lightbox-stage";
  var lightboxImg = document.createElement("img");
  var lightboxSpot = document.createElement("span");
  lightboxSpot.className = "spot";
  lightboxStage.appendChild(lightboxImg);
  lightboxStage.appendChild(lightboxSpot);
  lightbox.appendChild(lightboxStage);
  document.body.appendChild(lightbox);

  function closeLightbox() {
    lightbox.classList.remove("open");
    lightboxImg.src = "";
    document.body.style.overflow = "";
  }

  lightbox.addEventListener("click", closeLightbox);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && lightbox.classList.contains("open")) closeLightbox();
  });

  document.querySelectorAll(".shot img:not(.crop)").forEach(function (img) {
    img.addEventListener("click", function () {
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt || "";
      // 강조 표시(.spot)가 있는 이미지면 확대 화면에도 같은 좌표로 복제
      var spot = img.closest(".spotlight") && img.closest(".spotlight").querySelector(".spot");
      if (spot) {
        lightboxSpot.style.cssText = spot.style.cssText;
        lightboxSpot.style.display = "block";
      } else {
        lightboxSpot.style.display = "none";
      }
      lightbox.classList.add("open");
      document.body.style.overflow = "hidden";
    });
  });
})();
