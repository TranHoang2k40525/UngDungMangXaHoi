flowchart TD
  subgraph User
    start([Start]) --> compose["Compose Post (text + media)"]
    compose --> checkMedia{"Has media?"}
    checkMedia -->|Yes| upload["Upload media to CDN"]
    checkMedia -->|No| skipUpload["Skip upload"]
    upload --> sendAI["Send caption/media to AI Moderation"]
    skipUpload --> sendAI
  end

  subgraph System
    sendAI --> decision{"AI: Risk level?"}
    decision -->|High| block["Block post & notify user"]
    decision -->|Medium| pending["Mark as pending for review"]
    decision -->|Low| save["Save post to DB"]
    save --> notify["Notify followers (SignalR)"]
    pending --> queue["Queue for manual review"]
    queue --> moderator["Moderator review"]
    moderator -->|Approve| save
    moderator -->|Reject| block
    notify --> end([End])
    block --> end
  end
