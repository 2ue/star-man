import { StarredRepo, RepoAnalysisResult } from './types';

// ============ 常量配置 ============

const LANGUAGE_CATEGORIES: Record<string, string> = {
  'JavaScript': 'Frontend',
  'TypeScript': 'Frontend',
  'React': 'Frontend',
  'Vue': 'Frontend',
  'Angular': 'Frontend',
  'HTML': 'Frontend',
  'CSS': 'Frontend',
  'SCSS': 'Frontend',
  'Python': 'Backend',
  'Java': 'Backend',
  'Go': 'Backend',
  'Rust': 'Backend',
  'C++': 'System',
  'C': 'System',
  'Shell': 'DevOps',
  'Dockerfile': 'DevOps',
  'YAML': 'DevOps',
  'PHP': 'Backend',
  'Ruby': 'Backend',
  'Swift': 'Mobile',
  'Kotlin': 'Mobile',
  'Dart': 'Mobile',
  'Jupyter Notebook': 'Data Science',
  'R': 'Data Science',
  'MATLAB': 'Data Science',
};

const FRAMEWORK_KEYWORDS: Record<string, string[]> = {
  'React': ['react', 'jsx', 'next.js', 'nextjs', 'gatsby'],
  'Vue': ['vue', 'nuxt', 'vuejs'],
  'Angular': ['angular', 'ng', 'angularjs'],
  'Node.js': ['node', 'nodejs', 'express', 'koa', 'fastify'],
  'Django': ['django', 'python-web'],
  'Flask': ['flask', 'python-web'],
  'Spring': ['spring', 'spring-boot', 'java-web'],
  'Laravel': ['laravel', 'php-web'],
  'Rails': ['rails', 'ruby-web'],
  'Docker': ['docker', 'container', 'containerization'],
  'Kubernetes': ['kubernetes', 'k8s', 'orchestration'],
  'Machine Learning': ['ml', 'machine-learning', 'tensorflow', 'pytorch', 'scikit-learn'],
  'Deep Learning': ['deep-learning', 'neural-network', 'ai', 'artificial-intelligence'],
  'Database': ['database', 'sql', 'nosql', 'mongodb', 'postgresql', 'mysql'],
  'Testing': ['test', 'testing', 'jest', 'mocha', 'pytest', 'junit'],
  'CLI': ['cli', 'command-line', 'terminal', 'console'],
  'API': ['api', 'rest', 'graphql', 'openapi', 'swagger'],
  'Blockchain': ['blockchain', 'crypto', 'bitcoin', 'ethereum', 'web3'],
  'Game': ['game', 'gaming', 'unity', 'unreal', 'godot'],
  'Security': ['security', 'auth', 'authentication', 'encryption', 'cybersecurity'],
};

// ============ 纯函数 ============

/**
 * 分析仓库并生成分类和标签
 * 纯函数 - 无副作用，相同输入总是返回相同输出
 */
export function analyzeRepo(repo: StarredRepo): RepoAnalysisResult {
  const tags: string[] = [];
  let category = 'Other';
  let confidence = 0.5;

  // 基于语言分类
  if (repo.language) {
    const langCategory = LANGUAGE_CATEGORIES[repo.language];
    if (langCategory) {
      category = langCategory;
      confidence += 0.3;
    }
    tags.push(repo.language.toLowerCase());
  }

  // 基于仓库名称和描述分析
  const text = `${repo.name} ${repo.description || ''}`.toLowerCase();

  // 检查框架和技术关键词
  for (const [framework, keywords] of Object.entries(FRAMEWORK_KEYWORDS)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      tags.push(framework.toLowerCase().replace(/\s+/g, '-'));
      confidence += 0.1;
    }
  }

  // 基于 topics 添加标签
  if (repo.topics && repo.topics.length > 0) {
    tags.push(...repo.topics.map(topic => topic.toLowerCase()));
    confidence += 0.2;
  }

  // 基于仓库特征调整分类
  if (text.includes('frontend') || text.includes('ui') || text.includes('component')) {
    category = 'Frontend';
    confidence += 0.2;
  } else if (text.includes('backend') || text.includes('server') || text.includes('api')) {
    category = 'Backend';
    confidence += 0.2;
  } else if (text.includes('mobile') || text.includes('android') || text.includes('ios')) {
    category = 'Mobile';
    confidence += 0.2;
  } else if (text.includes('devops') || text.includes('deploy') || text.includes('ci/cd')) {
    category = 'DevOps';
    confidence += 0.2;
  } else if (text.includes('data') || text.includes('analytics') || text.includes('visualization')) {
    category = 'Data Science';
    confidence += 0.2;
  } else if (text.includes('tool') || text.includes('utility') || text.includes('helper')) {
    category = 'Tools';
    confidence += 0.1;
  } else if (text.includes('learn') || text.includes('tutorial') || text.includes('example')) {
    category = 'Learning';
    confidence += 0.1;
  }

  // 基于仓库大小和活跃度调整置信度
  if (repo.stargazers_count > 1000) {
    confidence += 0.1;
  }
  if (repo.forks_count > 100) {
    confidence += 0.1;
  }

  // 去重并限制标签数量
  const uniqueTags = [...new Set(tags)].slice(0, 10);

  return {
    category,
    tags: uniqueTags,
    confidence: Math.min(confidence, 1.0),
  };
}

/**
 * 为多个仓库建议通用标签
 * 纯函数 - 无副作用
 */
export function suggestTags(repos: StarredRepo[]): string[] {
  const tagFrequency: Record<string, number> = {};

  repos.forEach(repo => {
    const analysis = analyzeRepo(repo);
    analysis.tags.forEach(tag => {
      tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
    });
  });

  // 返回出现频率最高的标签
  return Object.entries(tagFrequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .map(([tag]) => tag);
}

/**
 * 对仓库列表进行分类
 * 纯函数 - 无副作用
 */
export function categorizeRepos(repos: StarredRepo[]): Record<string, StarredRepo[]> {
  const categories: Record<string, StarredRepo[]> = {};

  repos.forEach(repo => {
    const analysis = analyzeRepo(repo);
    if (!categories[analysis.category]) {
      categories[analysis.category] = [];
    }
    categories[analysis.category].push(repo);
  });

  return categories;
}
