import { ExternalLink, Clock } from "lucide-react";

function getSource(url) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "News";
  }
}

function formatDate(dateStr) {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function stripHtml(html) {
  return html?.replace(/<[^>]*>/g, "").replace(/&[^;]+;/g, " ").trim() || "";
}

export default function NewsCard({ article }) {
  const source = getSource(article.link);
  const excerpt = stripHtml(article.description).slice(0, 140);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-navy/20 transition-all">
      <div className="flex items-start gap-3">
        {article.thumbnail && (
          <img
            src={article.thumbnail}
            alt=""
            className="w-16 h-16 rounded-lg object-cover flex-shrink-0 bg-gray-100"
            onError={(e) => { e.target.style.display = "none"; }}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-semibold bg-navy/5 text-navy px-2 py-0.5 rounded-full">
              {source}
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Clock size={11} />
              {formatDate(article.pubDate)}
            </span>
          </div>
          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm font-semibold text-gray-900 hover:text-navy leading-snug mb-1.5 line-clamp-2"
          >
            {article.title}
          </a>
          {excerpt && (
            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
              {excerpt}
            </p>
          )}
          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-2 text-xs text-navy font-medium hover:underline"
          >
            Read more <ExternalLink size={11} />
          </a>
        </div>
      </div>
    </div>
  );
}
