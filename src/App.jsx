import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";

function App() {
  const [posterName, setPosterName] = useState("");
  const [inputPosterName, setInputPosterName] = useState("");
  const [quotes, setQuotes] = useState([]);
  const [tab, setTab] = useState("mine"); // "mine" | "public"
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null); // { type: "success" | "error", message: string }
  const [toastVisible, setToastVisible] = useState(false);
  const [userId, setUserId] = useState(null);

  // フォーム用
  const [text, setText] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [source, setSource] = useState("");
  const [tags, setTags] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  // 初回に posterName を localStorage から読む
  useEffect(() => {
    const saved = localStorage.getItem("posterName");
    if (saved) {
      setPosterName(saved);
    }
  }, []);

  // 匿名ログイン
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        setUserId(session.user.id);
        return;
      }
      const { data } = await supabase.auth.signInAnonymously();
      setUserId(data.user.id);
    })();
  }, []);

  // 名言取得
  useEffect(() => {
    if (!userId) return;
    fetchQuotes();
  }, [userId, tab]);

  // toastを掃除する
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);
  
// 自分の名言を表示

  useEffect(() => {
    if (posterName) {
      fetchQuotes();
    }
  }, [posterName, tab]);

  async function fetchQuotes() {
    setLoading(true);
    let query = supabase.from("quotes").select("*").order("created_at", { ascending: false });

      if (tab === "mine") {
        query = query.eq("user_id", userId);
      } else {
        query = query.eq("is_public", true);
      }

    const { data, error } = await query;
    if (error) {
      console.error(error);
    } else {
      setQuotes(data);
    }
    setLoading(false);
  }


function showToast(type, message) {
  setToast({ type, message });
  setToastVisible(false);

  // 1フレーム遅らせて transition を効かせる
  requestAnimationFrame(() => setToastVisible(true));

  window.clearTimeout(showToast._t);
  showToast._t = window.setTimeout(() => {
    setToastVisible(false);
    window.setTimeout(() => setToast(null), 250); // 退場アニメの後に消す
  }, 2200);
}



async function handleSaveQuote(e) {
  e.preventDefault();
  const MAX_LENGTH = 200;
  const cleanedText = text.trim();
  const POST_INTERVAL_MS = 30 * 1000; // 30秒
  const lastPostAt = localStorage.getItem("lastPostAt"); 
  const now = Date.now();

  if (!posterName) {
    alert("まずは投稿者名を登録してください");
    return;
  }

  if (cleanedText.length === 0) {
    showToast("error", "名言本文は必須です");
    return;
    }

  if (cleanedText.length > MAX_LENGTH) {
    showToast("error", `名言は${MAX_LENGTH}文字以内で入力してください`);
    return;
  }
  
if (lastPostAt && now - Number(lastPostAt) < POST_INTERVAL_MS) {
  const waitSec = Math.ceil(
    (POST_INTERVAL_MS - (now - Number(lastPostAt))) / 1000
  );
  showToast("error", `あと${waitSec}秒待ってください`);
  return;
}


  setIsSubmitting(true);
  try {
    const cleanedText = text.trim();
    const cleanedPoster = (posterName || "").trim();

    const { error } = await supabase.from("quotes").insert({
      user_id: userId,
      poster_name: cleanedPoster || "匿名",
      text: cleanedText,
      tags: tags || null,
      is_public: isPublic,
    });

    if (error) {
      console.error(error);
      showToast("error", "保存に失敗しました");
      return;
    }

    localStorage.setItem("lastPostAt", String(Date.now()));

    // フォームクリア & 再読込

    setText("");
    setTags("");
    setIsPublic(true);
    fetchQuotes()
    showToast("success", "投稿をみんなに公開しました");
  } 
    finally {
    setIsSubmitting(false);
  }
  }

  function handleRegisterPosterName() {
    if (!inputPosterName.trim()) return;
    setPosterName(inputPosterName.trim());
    localStorage.setItem("posterName", inputPosterName.trim());
  }
  return (
  <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {toast && (
          <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
            <div
              className={[
                "w-full max-w-md rounded-2xl border bg-white px-4 py-3 text-sm font-semibold shadow-lg",
                "transition-all duration-200 ease-out",
                toastVisible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
                toast.type === "success" ? "border-zinc-200 text-zinc-900" : "border-red-200 text-red-700",
              ].join(" ")}
              role="status"
              aria-live="polite"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    toast.type === "success" ? "bg-emerald-500" : "bg-red-500"
                  }`}
                  aria-hidden="true"
                />
                <span className="flex-1">{toast.message}</span>
                <button
                  onClick={() => {
                    setToastVisible(false);
                    window.setTimeout(() => setToast(null), 250);
                  }}
                  className="rounded-lg px-2 py-1 text-zinc-500 hover:bg-zinc-100"
                  aria-label="閉じる"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}
      <h1 className="txt-4xl font-bold text-blue-400 mb-8">
        名言メモ & みんなの名言
      </h1>

      {/* 投稿者名の設定 */}
      {!posterName && (
        <div className="mb-8 rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold text-zinc-900">
            投稿者名を決めてください
          </h2>
          <p className="mb-4 text-sm text-zinc-600">
            この名前は、あなたの投稿に表示されます（後で変更できます）
          </p>

          <input
            type="text"
            placeholder="例：anonymous / 匿名太郎"
            value={inputPosterName}
            onChange={(e) => setInputPosterName(e.target.value)}
            className="mb-4 w-full rounded-xl border border-zinc-300 bg-white px-4 py-2
                      text-zinc-900 placeholder-zinc-400
                      focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
          />

          <button
            onClick={handleRegisterPosterName}
            className="inline-flex items-center rounded-xl bg-zinc-900 px-5 py-2.5
                      text-sm font-semibold text-white
                      transition hover:bg-zinc-800 active:scale-[0.98]"
          >
            この名前で始める
          </button>
        </div>
      )}


      {posterName && (
        <div style={{ marginBottom: 16 }}>
          <span>あなたの名前: <strong>{posterName}</strong></span>
        </div>
      )}

      {/* タブ切り替え */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => setTab("mine")}
          style={{
            padding: "8px 16px",
            fontWeight: tab === "mine" ? "bold" : "normal",
          }}
        >
          自分の名言
        </button>
        <button
          onClick={() => setTab("public")}
          style={{
            padding: "8px 16px",
            fontWeight: tab === "public" ? "bold" : "normal",
          }}
        >
          みんなの名言
        </button>
      </div>

      {/* 名言登録フォーム */}
<form
  onSubmit={handleSaveQuote}
  className="mb-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
>
  <h2 className="mb-4 text-xl font-semibold text-zinc-900">
    あなたの言葉を投稿
  </h2>

  {/* 名言本文 */}
  <textarea
    placeholder="write your quote."
    value={text}
    onChange={(e) => setText(e.target.value)}
    className="mb-4 w-full resize-none rounded-xl border border-zinc-300 bg-white px-4 py-3
               text-zinc-900 placeholder-zinc-400
               focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
    rows={4}
  />

  {/* タグ */}
  <input
    type="text"
    placeholder="tag as you like ex. life / poet / work / family ."
    value={tags}
    onChange={(e) => setTags(e.target.value)}
    className="mb-4 w-full rounded-xl border border-zinc-300 bg-white px-4 py-2
               text-zinc-900 placeholder-zinc-400
               focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
  />

  {/* 公開チェック */}
  <label className="mb-4 flex items-center gap-2 text-sm text-zinc-700">
    <input
      type="checkbox"
      checked={isPublic}
      onChange={(e) => setIsPublic(e.target.checked)}
      className="h-4 w-4 rounded border-zinc-300 text-zinc-800 focus:ring-zinc-300"
    />
    みんなに公開する
  </label>

  {/* 保存ボタン */}
  <button
  type="submit"
  disabled={isSubmitting}
  className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-6 py-3
             text-sm font-semibold text-white shadow-sm
             transition
             hover:-translate-y-0.5 hover:bg-zinc-800 hover:shadow-md
             active:translate-y-0 active:scale-[0.99]
             disabled:cursor-not-allowed disabled:bg-zinc-400 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
  >
  {isSubmitting && (
    <span
      className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
      aria-hidden="true"
    />
  )}
  {isSubmitting ? "投稿中..." : "投稿する"}
</button>

</form>

      {/* 名言リスト */}
      <h2>{tab === "mine" ? "自分の名言" : "みんなの名言"}</h2>
      {loading && <p>読み込み中...</p>}
      {!loading && quotes.length === 0 && <p>まだ名言がありません。</p>}
      <ul className="space-y-4">
        {quotes.map((q) => (


<li
  key={q.id}
  className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition
             hover:-translate-y-1 hover:shadow-lg"
>
  {/* 引用符（左上） */}
  <div className="pointer-events-none absolute -top-2 -left-1 text-7xl font-black text-zinc-100 leading-none">
    “
  </div>

  {/* 本文 */}
  <p className="relative z-10 whitespace-pre-wrap text-lg leading-relaxed text-zinc-900">
    {q.text}
  </p>

  {/* メタ情報 */}
  <div className="relative z-10 mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-zinc-600">
    {q.author_name && (
      <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1">
        作者: <span className="ml-1 font-medium text-zinc-800">{q.author_name}</span>
      </span>
    )}
    <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1">
      投稿者: <span className="ml-1 font-medium text-zinc-800">{q.poster_name}</span>
    </span>

    {q.tags && (
      <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1">
        タグ: <span className="ml-1 font-medium text-zinc-800">{q.tags}</span>
      </span>
    )}
  </div>

  {/* アクション */}
  <div className="relative z-10 mt-4 flex items-center justify-between">
    <button
      onClick={() => {
        navigator.clipboard.writeText(q.text);
        alert("名言をコピーしました");
      }}
      className="inline-flex items-center rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800
                 shadow-sm transition hover:bg-zinc-50 active:scale-[0.98]"
    >
      copy
    </button>

    {/* 右下のさりげない装飾（ホバーで出る） */}
    <div className="opacity-0 transition group-hover:opacity-100 text-xs text-zinc-400">
      hover ✨
    </div>
  </div>
</li>

        ))}
      </ul>
    </div>
  </div>  
  );
}

export default App;
