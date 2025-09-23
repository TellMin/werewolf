# Architecture

## Scope

- 最大8人前後が同一ルームに参加し、音声・映像なしでコメントとゲーム進行データのみを同期する。
- Next.js 15 (App Router) を SSR ベースで構築し、Vercel へデプロイする。
- P2P メッシュ構成でブラウザ間のリアルタイム通信を行い、冗長構成や高耐障害性は求めない。

## Confirmed Decisions

- **P2Pレイヤー**: サンプル実装に倣い、純粋な WebRTC DataChannel + `socket.io` ベースのシグナリングを採用する。
- **シグナリングメッセージ**: `signal`, `join`, `user-joined` といったサンプルと同等のイベント名をベースに拡張する。
- **ICE 設定**: Google STUN (`stun:stun.l.google.com:19302`) を初期値として設定し、必要に応じて TURN を追加する。

## Signaling

- **Route Handler か Edge か**: サンプルの `socket.io` 実装を維持する前提では、Node.js ランタイムで動作する Route Handler (例: `src/app/api/signaling/socket/route.ts`) に寄せる方針が現実的。
  - ただし Vercel 上で長時間接続を維持できるか検証が必要。
- **ハンドラー配置案**:
  - `app/api/signaling/socket/route.ts` で WebSocket ハンドシェイクを処理し、SSR と同一の Next.js プロジェクト内で完結させる。
  - `socket.io` インスタンスはグローバル状態に保持し、ホットリロード時の多重初期化を避ける仕組みが必要。
- **検証タスク**:
  - Vercel 上での `socket.io` Route Handler の接続持続可否。
  - 開発環境 (`npm run dev`) と本番の接続 URL 差異（`http://localhost:3000` vs `https://werewolf-mu.vercel.app`）の吸収方法。

## DataChannel Design

- **チャネル構成**: コメント (`chat`) とゲーム進行 (`state`) を DataChannel 名で分離。
  - 信頼性や順序保証はゲーム要件に合わせて `ordered: true` を基本とする予定だが、遅延が問題となる場合の最適化検討が必要。
- **メッセージ形式**: JSON ベースで `{ type: 'chat', payload: { ... } }` のように統一する。
  - イベント種別やスキーマの詳細は未定。
- **バックプレッシャ**: 短時間に大量送信した際の制御方法（送信キュー / drop 戦略）は未確定。

## Room & Peer Lifecycle

- ジョイン時に配信するプレイヤー一覧の正／副管理をどこに置くか（DataChannel vs KV）を決定する必要がある。
- 切断検知、再接続（リトライ）戦略、ホスト不在時のリカバリをどう扱うか未定。

## Storage & KV

- ルーム設定や役職割り当てを永続化する KV (例: Upstash Redis) を採用するか検討中。
- DataChannel 同期を補完するためのスナップショット保存頻度、TTL、スキーマを決める必要がある。

## Error Handling

- シグナリング失敗、ICE 収束失敗、DataChannel 切断などのシナリオを列挙し、UI 提示と再試行ポリシーを整理する。
- STUN/TURN 到達不可時のリトライ間隔やフォールバック手段を明記する必要がある。

## Environment Variables

- `NEXT_PUBLIC_SIGNALING_URL`: クライアントが接続するシグナリングエンドポイント。
- `ICE_SERVERS`: STUN/TURN リスト（JSON 文字列 or 逗号区切り）。
- `SIGNALING_SECRET`/`SIGNALING_ROOM_PREFIX`: 認証やルーム識別に利用するか検討が必要。

## Outstanding Questions

- Vercel Route Handler での `socket.io` 稼働に問題がないか。
  - 必要なら代替ライブラリを検討する
- ルーム上限（現状「最大8人想定」だが確定していない）をプロダクト要件として明文化するか。
- TURN サーバーを準備するか（成功率向上 vs コスト）。
- 将来ボイスチャットを追加する場合の拡張性をどう確保するか。
  - 現在その予定はなし。
