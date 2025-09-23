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

### データフロー

1. **参加時フロー**
   - クライアント → シグナリングサーバー: `join` イベント送信
   - シグナリングサーバー → 既存ピア全員: `user-joined` イベント配信
   - 既存ピア → 新規参加者: WebRTC offer/answer交換
   - DataChannel確立後: 既存ピアから現在のゲーム状態をJSON形式で同期
2. **状態管理の責任分担**
   - **一時的な状態**: DataChannel経由でピア間直接同期（チャット、投票状態）
   - **永続的な状態**: KVストア（Upstash Redis）に保存（ルーム設定、役職割り当て、ゲーム結果）
   - **真実の源泉**: ホストピアが権威を持ち、KVへの書き込み権限を持つ
3. **離脱時フロー**
   - ピア切断検知 → 残存ピアへ通知
   - ホスト離脱時: 最も早く参加したピアが新ホストに昇格
   - KVストアへ最終状態をスナップショット保存（TTL: 24時間）

## Storage & KV

- ルーム設定や役職割り当てを永続化するため、Upstash Redis を KVストアとして採用する。
- DataChannel同期を補完するスナップショット保存：
  - **保存タイミング**: ゲームフェーズ変更時、ホスト交代時
  - **TTL**: 24時間（最終更新から）
  - **スキーマ**:
    ```json
        {
          "roomId": "string",
          "hostPeerId": "string",
          "gamePhase": "waiting|night|discussion|voting|result",
          "players": [{...}],
          "roles": {...},
          "lastUpdated": "ISO8601"
        }
    ```
  - 実装の優先順位：
    - Phase 1: P2P通信のみで動作する最小構成
    - Phase 2: KVストア統合による永続化・再接続対応

## Error Handling

### 障害シナリオと対処方針

| 障害タイプ           | 検出方法                   | リトライ戦略                            | UI表示                             |
| -------------------- | -------------------------- | --------------------------------------- | ---------------------------------- |
| シグナリング接続失敗 | WebSocket onerror          | 指数バックオフ (1s, 2s, 4s, 8s) 最大5回 | "接続中..." → "接続に失敗しました" |
| ICE接続確立失敗      | iceConnectionState: failed | 3秒後に1回再試行                        | "ピアとの接続を確立中..."          |
| DataChannel切断      | onclose イベント           | 即座に再接続試行（最大3回）             | "一時的に切断されました"           |
| STUN/TURN到達不可    | iceGatheringState: failed  | 別のSTUNサーバーにフォールバック        | サイレント切り替え                 |

### エラー時のフォールバック

- P2P接続が確立できない場合: シグナリングサーバー経由でのメッセージリレー（帯域制限あり）

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

## Dependencies

### npm パッケージ

**サーバーサイド (Next.js Route Handler):**

- `socket.io`: ^4.8.1 - WebSocketシグナリングサーバー
- `@upstash/redis`: ^1.34.0 - KVストア（オプション、ゲーム状態の永続化用）

**クライアントサイド:**

- `socket.io-client`: ^4.8.1 - シグナリングサーバーへの接続

**インストールコマンド:**

```bash
npm install socket.io socket.io-client
# オプション（KVストア使用時）
npm install @upstash/redis
```

### 外部サービス

- **STUN**: Google Public STUN (stun.l.google.com:19302) - 無料
- **KVストア**: Upstash Redis（オプション）
  - Free tier: 10,000コマンド/日、256MB

### Vercelデプロイ時の注意点

- WebSocketはVercel FunctionsのNode.jsランタイムで動作
- 長時間接続の制限があるため、定期的な再接続処理が必要
