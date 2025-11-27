export const environment = {
  production: false,

  // AI API 配置
  aiApis: {
    huggingFace: {
      token: 'your-access-token'
    },
    google: {
      projectId: 'your-google-cloud-project-id',
      accessToken: 'your-google-access-token'
    }
  },

  // 应用配置
  app: {
    maxHistoryItems: 50,
    defaultImageSize: {
      width: 512,
      height: 512
    }
  }
};
