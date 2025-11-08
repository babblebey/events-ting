import { PrismaClient } from "../generated/prisma/index.js";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Clear existing data (in reverse order of dependencies)
  console.log("🧹 Cleaning existing data...");
  await prisma.emailCampaign.deleteMany();
  await prisma.speakerSession.deleteMany();
  await prisma.cfpSubmission.deleteMany();
  await prisma.callForPapers.deleteMany();
  await prisma.speaker.deleteMany();
  await prisma.scheduleEntry.deleteMany();
  await prisma.registration.deleteMany();
  await prisma.ticketType.deleteMany();
  await prisma.event.deleteMany();
  await prisma.post.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  // Create Users
  console.log("👤 Creating users...");
  const hashedPassword = await bcrypt.hash("password123", 10);

  const organizer1 = await prisma.user.create({
    data: {
      email: "organizer@example.com",
      name: "Sarah Johnson",
      password: hashedPassword,
      emailVerified: new Date(),
    },
  });

  const organizer2 = await prisma.user.create({
    data: {
      email: "events@techcorp.com",
      name: "Michael Chen",
      password: hashedPassword,
      emailVerified: new Date(),
    },
  });

  const attendee1 = await prisma.user.create({
    data: {
      email: "attendee1@example.com",
      name: "Emily Davis",
      password: hashedPassword,
      emailVerified: new Date(),
    },
  });

  const attendee2 = await prisma.user.create({
    data: {
      email: "attendee2@example.com",
      name: "James Wilson",
      password: hashedPassword,
      emailVerified: new Date(),
    },
  });

  // Create Events
  console.log("🎉 Creating events...");
  
  // Event 1: Next.js Conference (Published, In-Person)
  const nextjsConf = await prisma.event.create({
    data: {
      slug: "nextjs-conf-2025",
      name: "Next.js Conf 2025",
      description:
        "Join us for the biggest Next.js conference of the year! Learn about the latest features, best practices, and real-world applications of Next.js from industry experts. Network with fellow developers and discover what's next for web development.",
      locationType: "in-person",
      locationAddress: "Moscone Center, 747 Howard St, San Francisco, CA 94103",
      locationUrl: null,
      timezone: "America/Los_Angeles",
      startDate: new Date("2025-06-15T09:00:00Z"),
      endDate: new Date("2025-06-16T18:00:00Z"),
      status: "published",
      organizerId: organizer1.id,
    },
  });

  // Event 2: React Workshop (Published, Virtual)
  const reactWorkshop = await prisma.event.create({
    data: {
      slug: "react-hooks-workshop",
      name: "React Hooks Deep Dive Workshop",
      description:
        "A comprehensive hands-on workshop covering advanced React Hooks patterns. Perfect for developers looking to master modern React development. Includes real-time coding sessions, Q&A, and practical exercises.",
      locationType: "virtual",
      locationAddress: null,
      locationUrl: "https://zoom.us/j/react-workshop-2025",
      timezone: "America/New_York",
      startDate: new Date("2025-05-20T14:00:00Z"),
      endDate: new Date("2025-05-20T18:00:00Z"),
      status: "published",
      organizerId: organizer2.id,
    },
  });

  // Event 3: TypeScript Summit (Draft, Hybrid)
  const tsSummit = await prisma.event.create({
    data: {
      slug: "typescript-summit-2025",
      name: "TypeScript Summit 2025",
      description:
        "The annual gathering of TypeScript enthusiasts! Explore advanced type patterns, compiler internals, and the future of type-safe JavaScript. Hybrid format allows both in-person and remote participation.",
      locationType: "hybrid",
      locationAddress: "Convention Center, Seattle, WA",
      locationUrl: "https://stream.ts-summit.com",
      timezone: "America/Los_Angeles",
      startDate: new Date("2025-09-10T09:00:00Z"),
      endDate: new Date("2025-09-12T17:00:00Z"),
      status: "draft",
      organizerId: organizer1.id,
    },
  });

  // Create Ticket Types
  console.log("🎟️ Creating ticket types...");
  
  // Next.js Conf Tickets
  const nextjsGeneralTicket = await prisma.ticketType.create({
    data: {
      eventId: nextjsConf.id,
      name: "General Admission",
      description: "Access to all sessions, networking events, and conference materials",
      price: 0,
      currency: "USD",
      quantity: 500,
      saleStart: new Date("2025-03-01T00:00:00Z"),
      saleEnd: new Date("2025-06-14T23:59:59Z"),
    },
  });

  const nextjsVipTicket = await prisma.ticketType.create({
    data: {
      eventId: nextjsConf.id,
      name: "VIP Pass",
      description:
        "All General Admission benefits plus early entry, VIP lounge access, and exclusive Q&A sessions with speakers",
      price: 0,
      currency: "USD",
      quantity: 50,
      saleStart: new Date("2025-03-01T00:00:00Z"),
      saleEnd: new Date("2025-06-14T23:59:59Z"),
    },
  });

  // React Workshop Ticket
  const reactWorkshopTicket = await prisma.ticketType.create({
    data: {
      eventId: reactWorkshop.id,
      name: "Workshop Access",
      description: "Full workshop access with hands-on exercises and materials",
      price: 0,
      currency: "USD",
      quantity: 100,
      saleStart: new Date("2025-04-01T00:00:00Z"),
      saleEnd: new Date("2025-05-20T12:00:00Z"),
    },
  });

  // TypeScript Summit Ticket
  const tsSummitEarlyBird = await prisma.ticketType.create({
    data: {
      eventId: tsSummit.id,
      name: "Early Bird",
      description: "Save by registering early! Full conference access.",
      price: 0,
      currency: "USD",
      quantity: 200,
      saleStart: new Date("2025-06-01T00:00:00Z"),
      saleEnd: new Date("2025-07-31T23:59:59Z"),
    },
  });

  // Create Registrations
  console.log("📝 Creating registrations...");
  
  await prisma.registration.createMany({
    data: [
      {
        eventId: nextjsConf.id,
        ticketTypeId: nextjsGeneralTicket.id,
        email: attendee1.email!,
        name: attendee1.name!,
        userId: attendee1.id,
        paymentStatus: "free",
        emailStatus: "active",
        registeredAt: new Date("2025-03-15T10:30:00Z"),
      },
      {
        eventId: nextjsConf.id,
        ticketTypeId: nextjsGeneralTicket.id,
        email: attendee2.email!,
        name: attendee2.name!,
        userId: attendee2.id,
        paymentStatus: "free",
        emailStatus: "active",
        registeredAt: new Date("2025-03-16T14:20:00Z"),
      },
      {
        eventId: nextjsConf.id,
        ticketTypeId: nextjsVipTicket.id,
        email: "vip@example.com",
        name: "Alex Martinez",
        paymentStatus: "free",
        emailStatus: "active",
        registeredAt: new Date("2025-03-10T09:00:00Z"),
      },
      {
        eventId: reactWorkshop.id,
        ticketTypeId: reactWorkshopTicket.id,
        email: attendee1.email!,
        name: attendee1.name!,
        userId: attendee1.id,
        paymentStatus: "free",
        emailStatus: "active",
        registeredAt: new Date("2025-04-05T11:15:00Z"),
      },
      {
        eventId: reactWorkshop.id,
        ticketTypeId: reactWorkshopTicket.id,
        email: "developer@startup.com",
        name: "Jordan Lee",
        paymentStatus: "free",
        emailStatus: "active",
        registeredAt: new Date("2025-04-08T16:45:00Z"),
      },
    ],
  });

  // Create Speakers
  console.log("🎤 Creating speakers...");
  
  const speaker1 = await prisma.speaker.create({
    data: {
      eventId: nextjsConf.id,
      name: "Dr. Emma Thompson",
      email: "emma.thompson@vercel.com",
      bio: "Senior Engineer at Vercel and core contributor to Next.js. Emma has been building web applications for over 10 years and specializes in performance optimization and developer experience.",
      photo: "/uploads/images/speakers/emma-thompson.jpg",
      twitter: "@emmathompson",
      github: "emmathompson",
      linkedin: "emma-thompson-dev",
      website: "https://emmathompson.dev",
    },
  });

  const speaker2 = await prisma.speaker.create({
    data: {
      eventId: nextjsConf.id,
      name: "Carlos Rodriguez",
      email: "carlos@techcorp.com",
      bio: "Tech Lead at TechCorp with expertise in full-stack development. Carlos is passionate about teaching and has spoken at conferences worldwide about React, Next.js, and modern web architecture.",
      photo: "/uploads/images/speakers/carlos-rodriguez.jpg",
      twitter: "@carlosrodriguez",
      github: "carlosrodriguez",
      linkedin: "carlos-rodriguez-tech",
      website: null,
    },
  });

  const speaker3 = await prisma.speaker.create({
    data: {
      eventId: reactWorkshop.id,
      name: "Sophie Anderson",
      email: "sophie@reactmastery.com",
      bio: "React trainer and author of 'Mastering React Hooks'. Sophie has trained thousands of developers and loves helping people unlock the power of modern React.",
      photo: "/uploads/images/speakers/sophie-anderson.jpg",
      twitter: "@sophieanderson",
      github: "sophieanderson",
      linkedin: "sophie-anderson",
      website: "https://reactmastery.com",
    },
  });

  // Create Schedule Entries
  console.log("📅 Creating schedule entries...");
  
  // Next.js Conf - Day 1
  const keynote = await prisma.scheduleEntry.create({
    data: {
      eventId: nextjsConf.id,
      title: "The Future of Next.js",
      description:
        "Join us for an exciting keynote presentation unveiling the latest innovations in Next.js. Discover new features, performance improvements, and the roadmap ahead.",
      startTime: new Date("2025-06-15T09:30:00-07:00"),
      endTime: new Date("2025-06-15T10:30:00-07:00"),
      location: "Main Stage",
      track: "Keynote",
      trackColor: "#3B82F6",
      sessionType: "keynote",
    },
  });

  const serverComponents = await prisma.scheduleEntry.create({
    data: {
      eventId: nextjsConf.id,
      title: "Deep Dive into React Server Components",
      description:
        "Explore the architecture and benefits of React Server Components. Learn how to build faster, more efficient applications with this game-changing technology.",
      startTime: new Date("2025-06-15T11:00:00-07:00"),
      endTime: new Date("2025-06-15T12:00:00-07:00"),
      location: "Room A",
      track: "Technical",
      trackColor: "#10B981",
      sessionType: "talk",
    },
  });

  const perfOptimization = await prisma.scheduleEntry.create({
    data: {
      eventId: nextjsConf.id,
      title: "Performance Optimization Strategies",
      description:
        "Learn proven techniques to optimize your Next.js applications. Topics include image optimization, code splitting, caching strategies, and Core Web Vitals.",
      startTime: new Date("2025-06-15T11:00:00-07:00"),
      endTime: new Date("2025-06-15T12:00:00-07:00"),
      location: "Room B",
      track: "Performance",
      trackColor: "#F59E0B",
      sessionType: "talk",
    },
  });

  const lunchBreak = await prisma.scheduleEntry.create({
    data: {
      eventId: nextjsConf.id,
      title: "Lunch & Networking",
      description: "Enjoy lunch and connect with fellow attendees and speakers.",
      startTime: new Date("2025-06-15T12:00:00-07:00"),
      endTime: new Date("2025-06-15T13:30:00-07:00"),
      location: "Main Hall",
      track: null,
      trackColor: null,
      sessionType: "break",
    },
  });

  // React Workshop Schedule
  const workshopIntro = await prisma.scheduleEntry.create({
    data: {
      eventId: reactWorkshop.id,
      title: "Introduction to Advanced Hooks",
      description:
        "Overview of custom hooks, useReducer, useContext, and composition patterns.",
      startTime: new Date("2025-05-20T14:00:00-04:00"),
      endTime: new Date("2025-05-20T15:00:00-04:00"),
      location: "Virtual Room",
      track: "Workshop",
      trackColor: "#8B5CF6",
      sessionType: "workshop",
    },
  });

  const workshopHandsOn = await prisma.scheduleEntry.create({
    data: {
      eventId: reactWorkshop.id,
      title: "Hands-On: Building Custom Hooks",
      description:
        "Practical exercises building reusable custom hooks for common use cases.",
      startTime: new Date("2025-05-20T15:15:00-04:00"),
      endTime: new Date("2025-05-20T16:45:00-04:00"),
      location: "Virtual Room",
      track: "Workshop",
      trackColor: "#8B5CF6",
      sessionType: "workshop",
    },
  });

  // Create Speaker-Session Assignments
  console.log("🔗 Assigning speakers to sessions...");
  
  await prisma.speakerSession.createMany({
    data: [
      {
        scheduleEntryId: keynote.id,
        speakerId: speaker1.id,
        role: "speaker",
      },
      {
        scheduleEntryId: serverComponents.id,
        speakerId: speaker1.id,
        role: "speaker",
      },
      {
        scheduleEntryId: perfOptimization.id,
        speakerId: speaker2.id,
        role: "speaker",
      },
      {
        scheduleEntryId: workshopIntro.id,
        speakerId: speaker3.id,
        role: "speaker",
      },
      {
        scheduleEntryId: workshopHandsOn.id,
        speakerId: speaker3.id,
        role: "speaker",
      },
    ],
  });

  // Create Call for Papers
  console.log("📢 Creating Call for Papers...");
  
  const nextjsCfp = await prisma.callForPapers.create({
    data: {
      eventId: nextjsConf.id,
      guidelines: `# Next.js Conf 2025 - Call for Papers

We're looking for speakers to share their expertise at Next.js Conf 2025!

## Session Types
- **Talks** (30-45 minutes): In-depth technical presentations
- **Workshops** (2-3 hours): Hands-on learning experiences
- **Lightning Talks** (10 minutes): Quick insights and tips

## Topics
- Next.js features and best practices
- React Server Components
- Performance optimization
- Real-world case studies
- Developer experience improvements

## What We Provide
- Travel and accommodation for accepted speakers
- Professional AV support
- Access to all conference events
- Networking opportunities

## Selection Criteria
- Technical depth and accuracy
- Practical value for attendees
- Clear communication skills
- Diverse perspectives

Submit your proposal by the deadline. We'll review all submissions and notify you of our decision by April 30, 2025.`,
      deadline: new Date("2025-04-15T23:59:59Z"),
      status: "open",
      requiredFields: {
        fields: ["title", "description", "sessionFormat", "speakerBio"],
      },
    },
  });

  // Create CFP Submissions
  console.log("📄 Creating CFP submissions...");
  
  const submission1 = await prisma.cfpSubmission.create({
    data: {
      eventId: nextjsConf.id,
      cfpId: nextjsCfp.id,
      title: "Building Real-Time Applications with Next.js",
      description:
        "Learn how to build real-time collaborative applications using Next.js, WebSockets, and React Server Components. This talk covers architecture patterns, state synchronization, and production deployment strategies.",
      sessionFormat: "talk",
      duration: 45,
      speakerName: "Alex Kim",
      speakerEmail: "alex.kim@example.com",
      speakerBio:
        "Full-stack developer with 8 years of experience building real-time systems. Currently leading the engineering team at CollabTech.",
      speakerPhoto: "/uploads/images/speakers/alex-kim.jpg",
      speakerTwitter: "@alexkim",
      speakerGithub: "alexkim",
      speakerLinkedin: "alex-kim-dev",
      speakerWebsite: "https://alexkim.dev",
      status: "pending",
      submittedAt: new Date("2025-03-20T10:00:00Z"),
    },
  });

  const submission2 = await prisma.cfpSubmission.create({
    data: {
      eventId: nextjsConf.id,
      cfpId: nextjsCfp.id,
      title: "Migrating a Legacy App to Next.js: Lessons Learned",
      description:
        "A case study of migrating a large-scale PHP application to Next.js. Discover strategies for incremental migration, SEO preservation, and team training.",
      sessionFormat: "talk",
      duration: 30,
      speakerName: "Maria Santos",
      speakerEmail: "maria.santos@example.com",
      speakerBio:
        "Engineering Manager at FinanceCorp. Led the migration of a 10-year-old monolith to modern web architecture.",
      speakerPhoto: null,
      speakerTwitter: "@mariasantos",
      speakerGithub: "mariasantos",
      speakerLinkedin: "maria-santos",
      speakerWebsite: null,
      status: "accepted",
      reviewScore: 9,
      reviewNotes: "Excellent real-world case study. Very relevant for our audience.",
      reviewedAt: new Date("2025-03-25T14:30:00Z"),
      speakerId: speaker2.id, // Link to auto-created speaker
    },
  });

  const submission3 = await prisma.cfpSubmission.create({
    data: {
      eventId: nextjsConf.id,
      cfpId: nextjsCfp.id,
      title: "Introduction to Web3 with Next.js",
      description:
        "Learn how to integrate blockchain technology into your Next.js applications. Topics include wallet connections, smart contracts, and decentralized storage.",
      sessionFormat: "workshop",
      duration: 120,
      speakerName: "Chris Johnson",
      speakerEmail: "chris@web3dev.com",
      speakerBio: "Web3 enthusiast and educator. Creator of multiple blockchain tutorials.",
      speakerPhoto: null,
      speakerTwitter: "@chrisjohnson",
      speakerGithub: null,
      speakerLinkedin: null,
      speakerWebsite: "https://web3dev.com",
      status: "rejected",
      reviewScore: 4,
      reviewNotes: "Too niche for our audience. Focus should remain on Next.js core features.",
      reviewedAt: new Date("2025-03-26T09:15:00Z"),
    },
  });

  // Create Email Campaigns
  console.log("📧 Creating email campaigns...");
  
  const welcomeCampaign = await prisma.emailCampaign.create({
    data: {
      eventId: nextjsConf.id,
      subject: "Welcome to Next.js Conf 2025! 🎉",
      body: `Hi {{name}},

Thank you for registering for Next.js Conf 2025!

We're excited to have you join us on June 15-16 at the Moscone Center in San Francisco.

**What's Next?**
- Check out our schedule: https://nextjs-conf-2025.com/schedule
- Meet our speakers: https://nextjs-conf-2025.com/speakers
- Join our community Discord: https://discord.gg/nextjs-conf

**Important Details:**
- Event starts at 9:00 AM PT on June 15
- Doors open at 8:00 AM for registration
- Don't forget to bring a photo ID

See you soon!
The Next.js Conf Team`,
      recipientType: "all_attendees",
      recipientFilter: null,
      status: "sent",
      scheduledFor: null,
      sentAt: new Date("2025-03-17T10:00:00Z"),
      totalRecipients: 3,
      delivered: 3,
      bounces: 0,
      opens: 2,
      clicks: 1,
    },
  });

  const reminderCampaign = await prisma.emailCampaign.create({
    data: {
      eventId: nextjsConf.id,
      subject: "Next.js Conf 2025 - One Week Away! ⏰",
      body: `Hi {{name}},

Next.js Conf 2025 is just one week away!

**Event Details:**
📅 Date: June 15-16, 2025
📍 Location: Moscone Center, San Francisco
⏰ Time: 9:00 AM - 6:00 PM PT

**Don't Miss:**
- Keynote with major Next.js announcements
- 20+ technical sessions
- Networking with 500+ developers
- Exclusive swag and giveaways

**Prepare for the Event:**
- Review the schedule: https://nextjs-conf-2025.com/schedule
- Download our mobile app for live updates
- Book your hotel if you haven't already

Questions? Reply to this email or visit our FAQ.

See you next week!
The Next.js Conf Team`,
      recipientType: "ticket_type",
      recipientFilter: {
        ticketTypeIds: [nextjsGeneralTicket.id, nextjsVipTicket.id],
      },
      status: "scheduled",
      scheduledFor: new Date("2025-06-08T09:00:00Z"),
      sentAt: null,
      totalRecipients: 3,
      delivered: 0,
      bounces: 0,
      opens: 0,
      clicks: 0,
    },
  });

  const vipCampaign = await prisma.emailCampaign.create({
    data: {
      eventId: nextjsConf.id,
      subject: "VIP Experience at Next.js Conf 2025 ⭐",
      body: `Hi {{name}},

As a VIP ticket holder, you're in for an exclusive experience at Next.js Conf 2025!

**VIP Benefits:**
✅ Early entry at 8:00 AM (30 minutes before general admission)
✅ Access to the VIP Lounge with refreshments
✅ Exclusive Q&A sessions with keynote speakers
✅ Premium swag bag
✅ Reserved seating in the main hall

**VIP Schedule:**
- 8:00 AM: VIP Registration & Breakfast
- 8:30 AM: Private Q&A with Dr. Emma Thompson
- 9:30 AM: Priority seating for keynote
- 12:30 PM: VIP lunch in the executive lounge

We look forward to providing you with an exceptional conference experience!

The Next.js Conf Team`,
      recipientType: "ticket_type",
      recipientFilter: {
        ticketTypeIds: [nextjsVipTicket.id],
      },
      status: "draft",
      scheduledFor: null,
      sentAt: null,
      totalRecipients: 1,
      delivered: 0,
      bounces: 0,
      opens: 0,
      clicks: 0,
    },
  });

  console.log("✅ Database seed completed successfully!");
  console.log("\n📊 Summary:");
  console.log(`- Users: 4 (2 organizers, 2 attendees)`);
  console.log(`- Events: 3 (1 published in-person, 1 published virtual, 1 draft hybrid)`);
  console.log(`- Ticket Types: 4 (across all events)`);
  console.log(`- Registrations: 5 (across Next.js Conf and React Workshop)`);
  console.log(`- Speakers: 3`);
  console.log(`- Schedule Entries: 7 (across 2 events)`);
  console.log(`- Speaker-Session Assignments: 5`);
  console.log(`- Call for Papers: 1 (Next.js Conf, open)`);
  console.log(`- CFP Submissions: 3 (1 pending, 1 accepted, 1 rejected)`);
  console.log(`- Email Campaigns: 3 (1 sent, 1 scheduled, 1 draft)`);
  console.log("\n🔐 Test Credentials:");
  console.log("Email: organizer@example.com | Password: password123");
  console.log("Email: events@techcorp.com | Password: password123");
  console.log("Email: attendee1@example.com | Password: password123");
  console.log("Email: attendee2@example.com | Password: password123");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
