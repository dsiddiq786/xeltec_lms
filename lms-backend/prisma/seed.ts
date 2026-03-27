import { PrismaClient, Role, SubscriptionCycle } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const adminPassword = await bcrypt.hash('admin123', 10);
  const learnerPassword = await bcrypt.hash('learner123', 10);
  const bizPassword = await bcrypt.hash('business123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@brickskill.com' },
    update: {},
    create: {
      email: 'admin@brickskill.com',
      password_hash: adminPassword,
      first_name: 'Admin',
      last_name: 'User',
      role: Role.ADMIN,
      is_active: true,
      email_verified: true,
    },
  });
  console.log(`  Admin user: ${admin.email} (password: admin123)`);

  const learner = await prisma.user.upsert({
    where: { email: 'learner@test.com' },
    update: {},
    create: {
      email: 'learner@test.com',
      password_hash: learnerPassword,
      first_name: 'Jane',
      last_name: 'Learner',
      role: Role.INDIVIDUAL,
      is_active: true,
      email_verified: true,
    },
  });
  console.log(`  Learner user: ${learner.email} (password: learner123)`);

  const bizAdmin = await prisma.user.upsert({
    where: { email: 'biz@test.com' },
    update: {},
    create: {
      email: 'biz@test.com',
      password_hash: bizPassword,
      first_name: 'Bob',
      last_name: 'Business',
      role: Role.BUSINESS_ADMIN,
      is_active: true,
      email_verified: true,
    },
  });
  console.log(`  Business admin: ${bizAdmin.email} (password: business123)`);

  const business = await prisma.business.upsert({
    where: { id: 'seed-business-1' },
    update: { signup_code: 'ACME-2026' },
    create: {
      id: 'seed-business-1',
      name: 'Acme Corp',
      owner_id: bizAdmin.id,
      signup_code: 'ACME-2026',
      seats_total: 20,
      seats_used: 0,
      subscription_status: 'active',
      billing_cycle: SubscriptionCycle.MONTHLY,
      kyc_status: 'PENDING',
    },
  });
  console.log(`  Business: ${business.name}`);

  const sampleCourse = await prisma.course.upsert({
    where: { id: 'seed-course-1' },
    update: {},
    create: {
      id: 'seed-course-1',
      title: 'Introduction to Web Development',
      description: 'A comprehensive course covering HTML, CSS, and JavaScript fundamentals for beginners.',
      base_price: 49.99,
      is_published: true,
      category: 'Technology',
      difficulty_level: 'beginner',
      thumbnail_url: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=300&fit=crop',
    },
  });

  const courseVersion = await prisma.courseVersion.upsert({
    where: { id: 'seed-cv-1' },
    update: {},
    create: {
      id: 'seed-cv-1',
      course_id: sampleCourse.id,
      version_number: 1,
      content_snapshot: {
        levels: [
          {
            title: 'HTML Basics',
            modules: [
              {
                title: 'Getting Started with HTML',
                slides: [
                  { type: 'content', title: 'What is HTML?', content: '<p>HTML (HyperText Markup Language) is the standard markup language for creating web pages.</p><p>It describes the structure of a web page using a series of elements that tell the browser how to display the content.</p>', image_url: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=600&h=400&fit=crop' },
                  { type: 'content', title: 'HTML Elements', content: '<p>An HTML element is defined by a start tag, some content, and an end tag.</p><p>Example: <code>&lt;h1&gt;My First Heading&lt;/h1&gt;</code></p>', image_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&h=400&fit=crop' },
                  { type: 'exercise', title: 'Quick Check', content: '<p>Which tag is used for the largest heading?</p>', question: 'Which tag creates the largest heading in HTML?', options: ['<h6>', '<h1>', '<heading>', '<big>'], correct_option: 1 },
                ],
              },
              {
                title: 'HTML Structure',
                slides: [
                  { type: 'content', title: 'Document Structure', content: '<p>Every HTML document has a basic structure with <code>&lt;html&gt;</code>, <code>&lt;head&gt;</code>, and <code>&lt;body&gt;</code> elements.</p>', image_url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&h=400&fit=crop' },
                  { type: 'content', title: 'Common Elements', content: '<p>Common HTML elements include headings, paragraphs, links, images, lists, and tables.</p>', image_url: 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=600&h=400&fit=crop' },
                ],
              },
            ],
          },
          {
            title: 'CSS Fundamentals',
            modules: [
              {
                title: 'Introduction to CSS',
                slides: [
                  { type: 'content', title: 'What is CSS?', content: '<p>CSS (Cascading Style Sheets) is used to style and layout web pages. It controls colors, fonts, spacing, and positioning.</p>', image_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=400&fit=crop' },
                  { type: 'content', title: 'CSS Selectors', content: '<p>CSS selectors target HTML elements to apply styles. Common selectors include element, class, and ID selectors.</p>', image_url: 'https://images.unsplash.com/photo-1515879218367-8466d910aede?w=600&h=400&fit=crop' },
                  { type: 'exercise', title: 'CSS Quiz', content: '<p>How do you select an element with id "header"?</p>', question: 'Which CSS selector targets an element with id "header"?', options: ['.header', '#header', 'header', '*header'], correct_option: 1 },
                ],
              },
            ],
          },
        ],
        assessment: {
          title: 'Final Assessment',
          passing_score: 70,
          questions: [
            { id: 'q1', question: 'What does HTML stand for?', options: ['Hyper Text Markup Language', 'High Tech Modern Language', 'Home Tool Markup Language', 'Hyper Transfer Markup Language'], correct_option: 0 },
            { id: 'q2', question: 'Which CSS property changes text color?', options: ['text-color', 'font-color', 'color', 'text-style'], correct_option: 2 },
            { id: 'q3', question: 'Which tag creates a hyperlink?', options: ['<link>', '<a>', '<href>', '<url>'], correct_option: 1 },
            { id: 'q4', question: 'What does CSS stand for?', options: ['Creative Style Sheets', 'Cascading Style Sheets', 'Computer Style Sheets', 'Colorful Style Sheets'], correct_option: 1 },
            { id: 'q5', question: 'Which HTML element defines the title of a document?', options: ['<meta>', '<head>', '<title>', '<header>'], correct_option: 2 },
          ],
        },
      },
    },
  });

  const sampleCourse2 = await prisma.course.upsert({
    where: { id: 'seed-course-2' },
    update: {},
    create: {
      id: 'seed-course-2',
      title: 'Project Management Fundamentals',
      description: 'Learn essential project management methodologies, tools, and techniques to deliver projects successfully.',
      base_price: 79.99,
      is_published: true,
      category: 'Business',
      difficulty_level: 'intermediate',
      thumbnail_url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=300&fit=crop',
    },
  });

  await prisma.courseVersion.upsert({
    where: { id: 'seed-cv-2' },
    update: {},
    create: {
      id: 'seed-cv-2',
      course_id: sampleCourse2.id,
      version_number: 1,
      content_snapshot: {
        levels: [
          {
            title: 'PM Basics',
            modules: [
              {
                title: 'What is Project Management?',
                slides: [
                  { type: 'content', title: 'Introduction', content: '<p>Project management is the application of knowledge, skills, tools, and techniques to project activities to meet requirements.</p>', image_url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=400&fit=crop' },
                  { type: 'content', title: 'The Triple Constraint', content: '<p>Every project is constrained by scope, time, and cost. These three factors form the "iron triangle" of project management.</p>', image_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop' },
                ],
              },
            ],
          },
        ],
        assessment: {
          title: 'PM Assessment',
          passing_score: 70,
          questions: [
            { id: 'q1', question: 'What are the three constraints in the iron triangle?', options: ['Scope, Time, Cost', 'Quality, Risk, Resources', 'People, Process, Technology', 'Plan, Execute, Close'], correct_option: 0 },
            { id: 'q2', question: 'What is a stakeholder?', options: ['The project manager', 'Anyone affected by the project', 'The client only', 'The team lead'], correct_option: 1 },
          ],
        },
      },
    },
  });

  const sampleCourse3 = await prisma.course.upsert({
    where: { id: 'seed-course-3' },
    update: {},
    create: {
      id: 'seed-course-3',
      title: 'Digital Marketing Essentials',
      description: 'Master the fundamentals of digital marketing including SEO, social media, and content strategy.',
      base_price: 59.99,
      is_published: true,
      category: 'Marketing',
      difficulty_level: 'beginner',
      thumbnail_url: 'https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?w=400&h=300&fit=crop',
    },
  });

  await prisma.courseVersion.upsert({
    where: { id: 'seed-cv-3' },
    update: {},
    create: {
      id: 'seed-cv-3',
      course_id: sampleCourse3.id,
      version_number: 1,
      content_snapshot: {
        levels: [
          {
            title: 'Digital Marketing Basics',
            modules: [
              {
                title: 'Introduction to Digital Marketing',
                slides: [
                  { type: 'content', title: 'The Digital Landscape', content: '<p>Digital marketing encompasses all marketing efforts that use electronic devices or the internet to connect with current and prospective customers.</p>', image_url: 'https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=600&h=400&fit=crop' },
                  { type: 'content', title: 'Key Channels', content: '<p>The main digital marketing channels include: Search Engine Optimization (SEO), Pay-Per-Click (PPC), Social Media, Email Marketing, and Content Marketing.</p>', image_url: 'https://images.unsplash.com/photo-1557838923-2985c318be48?w=600&h=400&fit=crop' },
                ],
              },
            ],
          },
        ],
        assessment: {
          title: 'Marketing Assessment',
          passing_score: 70,
          questions: [
            { id: 'q1', question: 'What does SEO stand for?', options: ['Search Engine Optimization', 'Social Email Outreach', 'Site Enhancement Operation', 'Search Entry Online'], correct_option: 0 },
            { id: 'q2', question: 'Which is NOT a digital marketing channel?', options: ['SEO', 'Email marketing', 'Billboard advertising', 'Social media'], correct_option: 2 },
          ],
        },
      },
    },
  });

  console.log(`  Courses: ${sampleCourse.title}, ${sampleCourse2.title}, ${sampleCourse3.title}`);
  console.log(`  Course versions created with content snapshots`);

  // Seed default AI generation settings
  await prisma.siteSetting.upsert({
    where: { key: 'ai_generation_settings' },
    update: {},
    create: {
      key: 'ai_generation_settings',
      value: {
        course_prompt: 'Create professional, engaging e-learning content suitable for corporate training. Use clear language, practical examples, and real-world scenarios. Maintain a professional but approachable tone throughout.',
        image_prompt: 'Modern flat illustration style, clean white background, professional corporate color scheme using teal and navy blue, minimalist design with clear visual hierarchy, suitable for e-learning platform',
        voiceover_prompt: 'Use a warm, professional tone. Speak clearly at a measured pace. Include brief natural pauses between key concepts. Avoid jargon unless it is defined first.',
        default_tts_voice: 'nova',
        default_tts_model: 'tts-1',
      },
    },
  });
  console.log('  AI generation defaults seeded');

  console.log('\n✅ Seed complete!');
  console.log('\n  Test accounts:');
  console.log('  ─────────────────────────────────────────');
  console.log('  Admin:    admin@brickskill.com / admin123');
  console.log('  Learner:  learner@test.com / learner123');
  console.log('  Business: biz@test.com / business123');
  console.log('  ─────────────────────────────────────────');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
