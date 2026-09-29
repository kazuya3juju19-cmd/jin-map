"use strict";

/* =========================================
   人員マップ 完全版
   API不要
========================================= */

const STORAGE_KEY = "person-map-data-v1";
const DARK_KEY = "person-map-dark-v1";

let people = loadPeople();

let filters = {
  search: "",
  department: "",
  status: "",
  location: "",
  favorite: false
};

let editingId = null;


/* =========================================
   初期化
========================================= */

document.addEventListener("DOMContentLoaded", () => {

  bindEvents();

  if (localStorage.getItem(DARK_KEY) === "true") {
    document.body.classList.add("dark");
  }

  renderAll();

});


/* =========================================
   データ
========================================= */

function loadPeople(){

  try{

    const saved = localStorage.getItem(STORAGE_KEY);

    if(!saved) return [];

    const data = JSON.parse(saved);

    return Array.isArray(data) ? data : [];

  }catch(error){

    console.error(error);

    return [];

  }

}


function savePeople(){

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(people)
  );

}


/* =========================================
   イベント
========================================= */

function bindEvents(){

  /* タブ */

  document.querySelectorAll(".tab").forEach(button => {

    button.addEventListener("click", () => {

      const view = button.dataset.view;

      document.querySelectorAll(".tab")
        .forEach(x => x.classList.remove("active"));

      button.classList.add("active");

      document.querySelectorAll(".view")
        .forEach(x => x.classList.remove("active"));

      document
        .getElementById(view + "View")
        .classList.add("active");

      renderAll();

    });

  });


  /* 検索 */

  document
    .getElementById("searchInput")
    .addEventListener("input", e => {

      filters.search =
        e.target.value.trim().toLowerCase();

      renderPeople();

    });


  document
    .getElementById("departmentFilter")
    .addEventListener("change", e => {

      filters.department = e.target.value;

      renderPeople();

    });


  document
    .getElementById("statusFilter")
    .addEventListener("change", e => {

      filters.status = e.target.value;

      renderPeople();

    });


  document
    .getElementById("locationFilter")
    .addEventListener("change", e => {

      filters.location = e.target.value;

      renderPeople();

    });


  document
    .getElementById("favoriteFilter")
    .addEventListener("click", () => {

      filters.favorite = !filters.favorite;

      document
        .getElementById("favoriteFilter")
        .classList.toggle(
          "active",
          filters.favorite
        );

      document
        .getElementById("favoriteFilter")
        .textContent =
          filters.favorite
          ? "★ お気に入りのみ"
          : "☆ お気に入り";

      renderPeople();

    });


  document
    .getElementById("clearFiltersBtn")
    .addEventListener("click", clearFilters);


  /* 人物追加 */

  document
    .getElementById("addPersonBtn")
    .addEventListener("click", () => {

      openPersonModal();

    });


  /* 予定追加 */

  document
    .getElementById("addScheduleBtn")
    .addEventListener("click", () => {

      if(people.length === 0){

        showToast("先に人物を登録してください");

        return;

      }

      openPersonModal(people[0].id);

      setTimeout(() => {

        addScheduleRow();

      }, 50);

    });


  /* 予定行 */

  document
    .getElementById("addScheduleRow")
    .addEventListener("click", addScheduleRow);


  /* フォーム */

  document
    .getElementById("personForm")
    .addEventListener("submit", savePerson);


  /* ダークモード */

  document
    .getElementById("darkModeBtn")
    .addEventListener("click", toggleDarkMode);


  /* バックアップ */

  document
    .getElementById("backupBtn")
    .addEventListener("click", backup);


  /* 復元 */

  document
    .getElementById("restoreBtn")
    .addEventListener("click", () => {

      document
        .getElementById("restoreInput")
        .click();

    });


  document
    .getElementById("restoreInput")
    .addEventListener("change", restore);


  /* モーダル閉じる */

  document
    .querySelectorAll("[data-close]")
    .forEach(button => {

      button.addEventListener("click", () => {

        closeModal(
          button.dataset.close
        );

      });

    });


  /* 背景クリック */

  document
    .querySelectorAll(".modal-backdrop")
    .forEach(modal => {

      modal.addEventListener("click", e => {

        if(e.target === modal){

          modal.classList.remove("show");

        }

      });

    });

}


/* =========================================
   全描画
========================================= */

function renderAll(){

  renderStats();

  renderFilters();

  renderPeople();

  renderTimeline();

  renderLocations();

}


/* =========================================
   統計
========================================= */

function renderStats(){

  document.getElementById("totalCount")
    .textContent = people.length;

  document.getElementById("onlineCount")
    .textContent =
      people.filter(p =>
        p.status === "online"
      ).length;

  document.getElementById("favoriteCount")
    .textContent =
      people.filter(p => p.favorite).length;

  const locations =
    new Set(
      people
        .map(p => p.location)
        .filter(Boolean)
    );

  document.getElementById("locationCount")
    .textContent = locations.size;

  const schedules =
    people.reduce(
      (sum,p) =>
        sum + (p.schedules?.length || 0),
      0
    );

  document.getElementById("scheduleCount")
    .textContent = schedules;

}


/* =========================================
   フィルター
========================================= */

function renderFilters(){

  const departments =
    [...new Set(
      people
        .map(p => p.department)
        .filter(Boolean)
    )].sort();

  const locations =
    [...new Set(
      people
        .map(p => p.location)
        .filter(Boolean)
    )].sort();


  const department =
    document.getElementById(
      "departmentFilter"
    );

  const location =
    document.getElementById(
      "locationFilter"
    );


  const currentDepartment =
    filters.department;

  const currentLocation =
    filters.location;


  department.innerHTML =
    `<option value="">全部署</option>` +
    departments
      .map(x =>
        `<option value="${escapeHtml(x)}">
          ${escapeHtml(x)}
        </option>`
      )
      .join("");


  location.innerHTML =
    `<option value="">全場所</option>` +
    locations
      .map(x =>
        `<option value="${escapeHtml(x)}">
          ${escapeHtml(x)}
        </option>`
      )
      .join("");


  department.value =
    currentDepartment;

  location.value =
    currentLocation;

}


/* =========================================
   人物検索
========================================= */

function getFilteredPeople(){

  return people.filter(person => {

    const text = [

      person.name,
      person.role,
      person.department,
      person.location,
      ...(person.skills || [])

    ]
      .join(" ")
      .toLowerCase();


    if(
      filters.search &&
      !text.includes(filters.search)
    ){

      return false;

    }


    if(
      filters.department &&
      person.department !== filters.department
    ){

      return false;

    }


    if(
      filters.status &&
      person.status !== filters.status
    ){

      return false;

    }


    if(
      filters.location &&
      person.location !== filters.location
    ){

      return false;

    }


    if(
      filters.favorite &&
      !person.favorite
    ){

      return false;

    }


    return true;

  });

}


/* =========================================
   人物カード
========================================= */

function renderPeople(){

  const grid =
    document.getElementById("peopleGrid");

  const list =
    getFilteredPeople();


  document.getElementById("resultText")
    .textContent =
      `${list.length}人 / ${people.length}人`;


  if(list.length === 0){

    grid.innerHTML = `

      <div class="empty">

        <div style="font-size:45px;">👥</div>

        <h3>
          ${people.length === 0
            ? "まだ人物が登録されていません"
            : "条件に一致する人物がいません"}
        </h3>

        <p>
          ${people.length === 0
            ? "「＋ 人物を追加」から登録してください。"
            : "検索条件を変更してください。"}
        </p>

      </div>

    `;

    return;

  }


  grid.innerHTML =
    list.map(createPersonCard).join("");


  grid
    .querySelectorAll("[data-action]")
    .forEach(button => {

      button.addEventListener("click", () => {

        const id =
          button.dataset.id;

        const action =
          button.dataset.action;


        if(action === "favorite"){

          toggleFavorite(id);

        }

        if(action === "edit"){

          openPersonModal(id);

        }

        if(action === "delete"){

          deletePerson(id);

        }

        if(action === "detail"){

          openDetail(id);

        }

      });

    });

}


/* =========================================
   人物カードHTML
========================================= */

function createPersonCard(person){

  const statusText = {

    online:"活動中",

    busy:"対応中",

    offline:"不在"

  }[person.status] || "不明";


  const schedules =
    person.schedules || [];


  const next =
    getNextSchedule(schedules);


  return `

    <article class="person-card">

      <button
        class="favorite"
        data-action="favorite"
        data-id="${person.id}"
        title="お気に入り"
      >
        ${person.favorite ? "★" : "☆"}
      </button>


      <div class="person-head">

        <div class="avatar">
          ${escapeHtml(person.avatar || "👤")}
        </div>

        <div>

          <div class="person-name">
            ${escapeHtml(person.name)}
          </div>

          <div class="person-role">
            ${escapeHtml(person.role || "役割未設定")}
          </div>

        </div>

      </div>


      <div class="info-list">

        <div class="info-row">
          🏢
          <strong>
            ${escapeHtml(person.department || "部署未設定")}
          </strong>
        </div>

        <div class="info-row">
          📍
          <strong>
            ${escapeHtml(person.location || "場所未設定")}
          </strong>
        </div>

        <div class="info-row">

          <span class="status ${person.status}">
            ● ${statusText}
          </span>

        </div>

      </div>


      <div class="skills">

        ${
          (person.skills || []).length
          ?

          person.skills
            .map(skill =>
              `<span class="skill">
                ${escapeHtml(skill)}
              </span>`
            )
            .join("")

          :

          `<span class="skill">
            得意分野未登録
          </span>`
        }

      </div>


      ${
        next

        ?

        `<div class="next-schedule">
          🕐 次の予定：
          <strong>
            ${escapeHtml(next.time)}
          </strong>
          ${escapeHtml(next.title)}
        </div>`

        :

        ""
      }


      <div class="card-actions">

        <button
          class="secondary-btn"
          data-action="detail"
          data-id="${person.id}"
        >
          詳細
        </button>

        <button
          class="secondary-btn"
          data-action="edit"
          data-id="${person.id}"
        >
          編集
        </button>

        <button
          class="filter-btn"
          data-action="delete"
          data-id="${person.id}"
        >
          🗑 削除
        </button>

      </div>

    </article>

  `;

}


/* =========================================
   人物追加・編集
========================================= */

function openPersonModal(id = null){

  editingId = id;

  const modal =
    document.getElementById("personModal");

  const form =
    document.getElementById("personForm");

  form.reset();


  document.getElementById(
    "scheduleEditor"
  ).innerHTML = "";


  if(id){

    const person =
      people.find(p => p.id === id);

    if(!person) return;


    document.getElementById(
      "personModalTitle"
    ).textContent = "人物を編集";


    document.getElementById(
      "personId"
    ).value = person.id;


    document.getElementById(
      "name"
    ).value = person.name || "";


    document.getElementById(
      "role"
    ).value = person.role || "";


    document.getElementById(
      "department"
    ).value = person.department || "";


    document.getElementById(
      "location"
    ).value = person.location || "";


    document.getElementById(
      "status"
    ).value =
      person.status || "online";


    document.getElementById(
      "avatar"
    ).value =
      person.avatar || "👤";


    document.getElementById(
      "skills"
    ).value =
      (person.skills || []).join(", ");


    (person.schedules || [])
      .forEach(schedule =>
        addScheduleRow(schedule)
      );

  }else{

    document.getElementById(
      "personModalTitle"
    ).textContent = "人物を追加";

    document.getElementById(
      "personId"
    ).value = "";

    document.getElementById(
      "avatar"
    ).value = "👤";

  }


  modal.classList.add("show");

}


/* =========================================
   予定行
========================================= */

function addScheduleRow(data = {}){

  const editor =
    document.getElementById(
      "scheduleEditor"
    );


  const row =
    document.createElement("div");

  row.className =
    "schedule-row";


  row.innerHTML = `

    <input
      type="time"
      class="schedule-time"
      value="${escapeAttr(data.time || "")}"
    >

    <input
      type="text"
      class="schedule-title"
      placeholder="予定"
      value="${escapeAttr(data.title || "")}"
    >

    <input
      type="text"
      class="schedule-location"
      placeholder="場所"
      value="${escapeAttr(data.location || "")}"
    >

    <button
      type="button"
      class="delete-schedule"
    >
      ×
    </button>

  `;


  row
    .querySelector(".delete-schedule")
    .addEventListener(
      "click",
      () => row.remove()
    );


  editor.appendChild(row);

}


/* =========================================
   保存
========================================= */

function savePerson(event){

  event.preventDefault();


  const name =
    document.getElementById("name")
      .value.trim();


  const role =
    document.getElementById("role")
      .value.trim();


  if(!name || !role){

    showToast(
      "名前と役割を入力してください"
    );

    return;

  }


  const schedules = [];

  document
    .querySelectorAll(".schedule-row")
    .forEach(row => {

      const time =
        row.querySelector(".schedule-time")
          .value;

      const title =
        row.querySelector(".schedule-title")
          .value.trim();

      const location =
        row.querySelector(".schedule-location")
          .value.trim();


      if(time || title || location){

        schedules.push({

          time,
          title,
          location

        });

      }

    });


  schedules.sort(
    (a,b) =>
      (a.time || "99:99")
      .localeCompare(
        b.time || "99:99"
      )
  );


  const personData = {

    name,

    role,

    department:
      document.getElementById("department")
        .value.trim(),

    location:
      document.getElementById("location")
        .value.trim(),

    status:
      document.getElementById("status")
        .value,

    avatar:
      document.getElementById("avatar")
        .value.trim() || "👤",

    skills:
      document.getElementById("skills")
        .value
        .split(",")
        .map(x => x.trim())
        .filter(Boolean),

    schedules

  };


  if(editingId){

    const index =
      people.findIndex(
        p => p.id === editingId
      );

    if(index !== -1){

      personData.id =
        editingId;

      personData.favorite =
        people[index].favorite || false;

      people[index] =
        personData;

    }

  }else{

    people.push({

      id:
        crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString(),

      favorite:false,

      ...personData

    });

  }


  savePeople();

  closeModal("personModal");

  renderAll();

  showToast(
    editingId
      ? "人物情報を更新しました"
      : "人物を追加しました"
  );

  editingId = null;

}


/* =========================================
   お気に入り
========================================= */

function toggleFavorite(id){

  const person =
    people.find(
      p => p.id === id
    );

  if(!person) return;

  person.favorite =
    !person.favorite;

  savePeople();

  renderAll();

}


/* =========================================
   削除
========================================= */

function deletePerson(id){

  const person =
    people.find(
      p => p.id === id
    );

  if(!person) return;


  const ok =
    confirm(
      `「${person.name}」を削除しますか？\nこの操作は元に戻せません。`
    );


  if(!ok) return;


  people =
    people.filter(
      p => p.id !== id
    );


  savePeople();

  renderAll();

  showToast(
    "人物を削除しました"
  );

}


/* =========================================
   詳細
========================================= */

function openDetail(id){

  const person =
    people.find(
      p => p.id === id
    );

  if(!person) return;


  const statusText = {

    online:"活動中",

    busy:"対応中",

    offline:"不在"

  }[person.status] || "不明";


  const detail =
    document.getElementById(
      "detailContent"
    );


  detail.innerHTML = `

    <div class="detail-head">

      <div class="detail-avatar">
        ${escapeHtml(person.avatar || "👤")}
      </div>

      <div>

        <h2>
          ${escapeHtml(person.name)}
        </h2>

        <div class="person-role">
          ${escapeHtml(person.role)}
        </div>

      </div>

    </div>


    <div class="detail-section">

      <h3>📌 基本情報</h3>

      <div class="info-list">

        <div class="info-row">
          🏢 部署：
          <strong>
            ${escapeHtml(person.department || "未設定")}
          </strong>
        </div>

        <div class="info-row">
          📍 現在地：
          <strong>
            ${escapeHtml(person.location || "未設定")}
          </strong>
        </div>

        <div class="info-row">
          ● 状態：
          <span class="status ${person.status}">
            ${statusText}
          </span>
        </div>

      </div>

    </div>


    <div class="detail-section">

      <h3>⭐ 得意分野</h3>

      <div class="skills">

        ${
          (person.skills || []).length
          ?

          person.skills
            .map(x =>
              `<span class="skill">
                ${escapeHtml(x)}
              </span>`
            )
            .join("")

          :

          "登録なし"
        }

      </div>

    </div>


    <div class="detail-section">

      <h3>📅 予定</h3>

      <div class="detail-schedule">

        ${
          (person.schedules || []).length

          ?

          person.schedules
            .map(x =>
              `<div>
                <strong>
                  ${escapeHtml(x.time || "--:--")}
                </strong>
               　
                ${escapeHtml(x.title || "予定")}
                ${
                  x.location
                  ? `　📍 ${escapeHtml(x.location)}`
                  : ""
                }
              </div>`
            )
            .join("")

          :

          "<div>予定なし</div>"
        }

      </div>

    </div>

  `;


  document
    .getElementById("detailModal")
    .classList.add("show");

}


/* =========================================
   タイムライン
========================================= */

function renderTimeline(){

  const timeline =
    document.getElementById(
      "timeline"
    );


  const items = [];


  people.forEach(person => {

    (person.schedules || [])
      .forEach(schedule => {

        items.push({

          ...schedule,

          person

        });

      });

  });


  items.sort(
    (a,b) =>
      (a.time || "99:99")
      .localeCompare(
        b.time || "99:99"
      )
  );


  if(items.length === 0){

    timeline.innerHTML = `

      <div class="empty">

        <div style="font-size:45px;">📅</div>

        <h3>予定がありません</h3>

        <p>
          人物を追加して予定を登録すると、
          ここに表示されます。
        </p>

      </div>

    `;

    return;

  }


  timeline.innerHTML =
    items.map(item => `

      <div class="timeline-item">

        <div class="timeline-time">
          ${escapeHtml(item.time || "--:--")}
        </div>

        <div class="timeline-card">

          <div class="timeline-name">

            ${escapeHtml(item.person.avatar || "👤")}

            ${escapeHtml(item.person.name)}

            — 

            ${escapeHtml(item.title || "予定")}

          </div>

          <div class="timeline-location">

            ${item.location
              ? "📍 " + escapeHtml(item.location)
              : ""}

            ${
              item.person.location
              ? "　現在地："
                + escapeHtml(item.person.location)
              : ""
            }

          </div>

        </div>

      </div>

    `).join("");

}


/* =========================================
   場所
========================================= */

function renderLocations(){

  const grid =
    document.getElementById(
      "locationGrid"
    );


  const groups = {};


  people.forEach(person => {

    const location =
      person.location || "場所未設定";


    if(!groups[location]){

      groups[location] = [];

    }


    groups[location].push(person);

  });


  const locations =
    Object.keys(groups).sort();


  if(locations.length === 0){

    grid.innerHTML = `

      <div class="empty">

        <div style="font-size:45px;">📍</div>

        <h3>場所情報がありません</h3>

        <p>
          人物を登録すると場所別に表示されます。
        </p>

      </div>

    `;

    return;

  }


  grid.innerHTML =
    locations.map(location => {

      const list =
        groups[location];


      return `

        <div class="group-card">

          <div class="group-title">

            📍 ${escapeHtml(location)}

            <span class="group-count">
              ${list.length}人
            </span>

          </div>


          ${list.map(person => `

            <div class="group-person">

              <div class="group-avatar">
                ${escapeHtml(person.avatar || "👤")}
              </div>

              <div>

                <strong>
                  ${escapeHtml(person.name)}
                </strong>

                <div style="
                  color:var(--sub);
                  font-size:11px;
                ">
                  ${escapeHtml(person.role || "")}
                </div>

              </div>

            </div>

          `).join("")}

        </div>

      `;

    }).join("");

}


/* =========================================
   次の予定
========================================= */

function getNextSchedule(schedules){

  if(!schedules || !schedules.length){

    return null;

  }


  const now =
    new Date();

  const current =
    now.getHours() * 60 +
    now.getMinutes();


  const future =
    schedules
      .filter(x => x.time)
      .map(x => {

        const [h,m] =
          x.time.split(":")
            .map(Number);

        return {

          ...x,

          minutes:
            h * 60 + m

        };

      })
      .filter(
        x => x.minutes >= current
      )
      .sort(
        (a,b) =>
          a.minutes - b.minutes
      );


  return future[0] || null;

}


/* =========================================
   フィルタークリア
========================================= */

function clearFilters(){

  filters = {

    search:"",
    department:"",
    status:"",
    location:"",
    favorite:false

  };


  document.getElementById(
    "searchInput"
  ).value = "";


  document.getElementById(
    "statusFilter"
  ).value = "";


  document.getElementById(
    "favoriteFilter"
  ).classList.remove("active");


  document.getElementById(
    "favoriteFilter"
  ).textContent =
    "☆ お気に入り";


  renderAll();

}


/* =========================================
   ダークモード
========================================= */

function toggleDarkMode(){

  const dark =
    document.body.classList.toggle("dark");


  localStorage.setItem(
    DARK_KEY,
    dark
  );


  document.getElementById(
    "darkModeBtn"
  ).textContent =
    dark ? "☀️" : "🌙";

}


/* =========================================
   バックアップ
========================================= */

function backup(){

  const data = {

    version:1,

    exportedAt:
      new Date().toISOString(),

    people

  };


  const blob =
    new Blob(
      [
        JSON.stringify(
          data,
          null,
          2
        )
      ],
      {
        type:"application/json"
      }
    );


  const url =
    URL.createObjectURL(blob);


  const a =
    document.createElement("a");


  a.href = url;

  a.download =
    `人員マップバックアップ-${formatDate()}.json`;


  a.click();


  URL.revokeObjectURL(url);


  showToast(
    "バックアップを保存しました"
  );

}


/* =========================================
   復元
========================================= */

function restore(event){

  const file =
    event.target.files[0];


  if(!file) return;


  const reader =
    new FileReader();


  reader.onload = () => {

    try{

      const data =
        JSON.parse(
          reader.result
        );


      if(
        !data ||
        !Array.isArray(data.people)
      ){

        throw new Error(
          "不正なバックアップ"
        );

      }


      const ok =
        confirm(
          `${data.people.length}人のデータを復元します。\n現在のデータは上書きされます。`
        );


      if(!ok) return;


      people =
        data.people;


      savePeople();

      renderAll();

      showToast(
        "データを復元しました"
      );


    }catch(error){

      console.error(error);

      alert(
        "復元できるバックアップファイルではありません。"
      );

    }

  };


  reader.readAsText(file);

  event.target.value = "";

}


/* =========================================
   モーダル
========================================= */

function closeModal(id){

  document
    .getElementById(id)
    .classList.remove("show");

}


/* =========================================
   Toast
========================================= */

let toastTimer = null;

function showToast(message){

  const toast =
    document.getElementById("toast");


  toast.textContent =
    message;


  toast.classList.add("show");


  clearTimeout(toastTimer);


  toastTimer =
    setTimeout(() => {

      toast.classList.remove("show");

    }, 2200);

}


/* =========================================
   日付
========================================= */

function formatDate(){

  const d =
    new Date();


  const y =
    d.getFullYear();


  const m =
    String(
      d.getMonth() + 1
    ).padStart(2,"0");


  const day =
    String(
      d.getDate()
    ).padStart(2,"0");


  return `${y}-${m}-${day}`;

}


/* =========================================
   XSS対策
========================================= */

function escapeHtml(value){

  return String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");

}


function escapeAttr(value){

  return escapeHtml(value);

}