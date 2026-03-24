import {
  InfoModalItem,
  InfoModalItems,
  InfoModalLead,
  InfoModalSection,
} from "../../../components/InfoModalSections";

function SourcesIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 5.5h9.5L19 9v9.5A1.5 1.5 0 0 1 17.5 20h-11A1.5 1.5 0 0 1 5 18.5v-11A2 2 0 0 1 7 5.5Z" />
      <path className="accent" d="M15.5 5.5V9H19" />
      <path d="M8.5 12h7" />
      <path d="M8.5 15.5h5.5" />
    </svg>
  );
}

function WeekIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.5 4.5v3" />
      <path d="M17.5 4.5v3" />
      <rect x="4.5" y="6.5" width="15" height="13" rx="2.5" />
      <path d="M4.5 10h15" />
      <path className="accent" d="M8.5 13.5h3" />
      <path className="accent" d="M12.5 13.5h3" />
      <path className="accent" d="M8.5 16.5h3" />
    </svg>
  );
}

function LogItemIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 5.5h10A1.5 1.5 0 0 1 18.5 7v10A1.5 1.5 0 0 1 17 18.5H7A1.5 1.5 0 0 1 5.5 17V7A1.5 1.5 0 0 1 7 5.5Z" />
      <path d="M8.5 9h7" />
      <path d="M8.5 12h7" />
      <path d="M8.5 15h4.5" />
    </svg>
  );
}

function SupportItemIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.5 16.5 10 13l3 2.5 4.5-6" />
      <path d="M5 18.5h14" />
      <path d="M5 5.5v13" />
    </svg>
  );
}

function SaveItemIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 5.5h8.5L19 9v8.5A1.5 1.5 0 0 1 17.5 19h-11A1.5 1.5 0 0 1 5 17.5v-10A2 2 0 0 1 7 5.5Z" />
      <path d="M8.5 5.5V10h6V5.5" />
      <path d="M8.5 14.5h7" />
    </svg>
  );
}

function CalendarItemIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 4.5v3" />
      <path d="M17 4.5v3" />
      <rect x="4.5" y="6.5" width="15" height="13" rx="2.5" />
      <path d="M4.5 10h15" />
      <path d="M8 14h8" />
    </svg>
  );
}

export default function AiRecommendationInfoContent() {
  return (
    <>
      <InfoModalLead>直近の記録と目標から、今週の練習プランをAIが提案します。</InfoModalLead>
      <InfoModalSection icon={<SourcesIcon />} title="SOURCES">
        <InfoModalItems>
          <InfoModalItem
            icon={<LogItemIcon />}
            title="主に使う"
            description="詳細ログは直近14日を主に使い、今の練習状況に近い内容をもとに提案します。"
          />
          <InfoModalItem
            icon={<SupportItemIcon />}
            title="補助"
            description="目標や改善したい項目、コミュニティで投稿されたトレーニング内容を参考にすることがあります。"
          />
          <InfoModalItem
            icon={<SaveItemIcon />}
            title="保存"
            description="生成結果はその週のおすすめとして保存され、後から見返せます。"
            noDivider
          />
        </InfoModalItems>
      </InfoModalSection>
      <InfoModalSection icon={<WeekIcon />} title="WEEK">
        <InfoModalItems>
          <InfoModalItem
            icon={<CalendarItemIcon />}
            title="1週間の区切り"
            description="おすすめは、月曜日から日曜日までを1週間として扱って表示・保存しています。"
            noDivider
          />
        </InfoModalItems>
      </InfoModalSection>
    </>
  );
}
