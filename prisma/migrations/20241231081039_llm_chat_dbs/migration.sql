-- CreateTable
CREATE TABLE "ChatStore" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "conversationId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "role" TEXT NOT NULL,

    CONSTRAINT "ChatStore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LLMConversation" (
    "id" TEXT NOT NULL,
    "tenant" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LLMConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LLMConfig" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "provider" TEXT NOT NULL,
    "baseURL" TEXT NOT NULL,
    "tenant" TEXT NOT NULL,
    "models" TEXT[],
    "isChatWithPDFProvider" BOOLEAN,
    "terminusToken" TEXT,
    "apiKey" TEXT,

    CONSTRAINT "LLMConfig_pkey" PRIMARY KEY ("id")
);
