// Teen Assessment Question Bank
// All questions as per specification

export const assessmentModules = {
    A: {
        id: "A",
        title: "Natural Liking",
        subtitle: "What you're drawn to",
        description: "Identify intrinsic motivation and what naturally energizes you",
        icon: "Heart",
        color: "#FF6B6B",
        type: "multiple-choice",
        questions: [
            {
                id: "A1",
                question: "You suddenly get 2 free hours and no phone. What do you choose?",
                options: [
                    { text: "Write, draw, or create something original", domain: "C" },
                    { text: "Solve a tough problem or puzzle", domain: "A" },
                    { text: "Help someone fix a personal issue", domain: "S" },
                    { text: "Practice a sport or physical skill", domain: "P" },
                ],
            },
            {
                id: "A2",
                question: "What kind of content do you click on without planning?",
                options: [
                    { text: "Stories, opinions, creative ideas", domain: "C" },
                    { text: "How things work, logic, systems", domain: "A" },
                    { text: "People, emotions, relationships", domain: "S" },
                    { text: "Action, challenges, competitions", domain: "P" },
                ],
            },
            {
                id: "A3",
                question: "After a tiring day, what leaves you energized?",
                options: [
                    { text: "Expressing thoughts creatively", domain: "C" },
                    { text: "Cracking a difficult question", domain: "A" },
                    { text: "Being useful to someone", domain: "S" },
                    { text: "Physical movement or performance", domain: "P" },
                ],
            },
            {
                id: "A4",
                question: "As a child, you most often lost track of time while:",
                options: [
                    { text: "Making up stories or drawings", domain: "C" },
                    { text: "Building or figuring things out", domain: "A" },
                    { text: "Playing or talking with others", domain: "S" },
                    { text: "Running, climbing, or performing", domain: "P" },
                ],
            },
            {
                id: "A5",
                question: "Even if no one notices, you still prefer to:",
                options: [
                    { text: "Improve something expressive", domain: "C" },
                    { text: "Improve accuracy or efficiency", domain: "A" },
                    { text: "Improve harmony or understanding", domain: "S" },
                    { text: "Improve speed or performance", domain: "P" },
                ],
            },
        ],
    },
    B: {
        id: "B",
        title: "Natural Strength",
        subtitle: "How your brain works",
        description: "Identify cognitive processing ease through timed micro-tasks",
        icon: "Brain",
        color: "#8B5CF6",
        type: "timed-quiz",
        questions: [
            {
                id: "B1",
                question: "Number Pattern: 2, 4, 8, 16, ?",
                options: [
                    { text: "18", domain: null, correct: false },
                    { text: "24", domain: null, correct: false },
                    { text: "32", domain: "A", correct: true },
                    { text: "64", domain: null, correct: false },
                ],
            },
            {
                id: "B2",
                question: "Direction Test: You face North. Turn right, then left, then left. Now you face:",
                options: [
                    { text: "North", domain: null, correct: false },
                    { text: "South", domain: "A", correct: true },
                    { text: "East", domain: null, correct: false },
                    { text: "West", domain: null, correct: false },
                ],
            },
            {
                id: "B3",
                question: "Odd One Out:",
                options: [
                    { text: "Poem", domain: null, correct: false },
                    { text: "Story", domain: null, correct: false },
                    { text: "Equation", domain: "C", correct: true },
                    { text: "Essay", domain: null, correct: false },
                ],
            },
            {
                id: "B4",
                question: "Logical Inference: All trees have roots. Some plants are trees. Therefore:",
                options: [
                    { text: "All plants have roots", domain: null, correct: false },
                    { text: "Some plants have roots", domain: "A", correct: true },
                    { text: "No plants have roots", domain: null, correct: false },
                    { text: "Cannot be determined", domain: null, correct: false },
                ],
            },
            {
                id: "B5",
                question: "Visual Rotation: A square is rotated twice by 90°. It ends up:",
                options: [
                    { text: "Same direction", domain: "P", correct: true },
                    { text: "Opposite direction", domain: null, correct: false },
                    { text: "Left", domain: null, correct: false },
                    { text: "Right", domain: null, correct: false },
                ],
            },
        ],
    },
    C: {
        id: "C",
        title: "Current Skill",
        subtitle: "What you can do",
        description: "Measure present-day execution ability through open-ended tasks",
        icon: "Target",
        color: "#10B981",
        type: "open-ended",
        tasks: [
            {
                id: "C1",
                title: "Expression Task",
                prompt: "Write 120–150 words on: One rule in school you would change and why.",
                minWords: 120,
                maxWords: 150,
                domain: "C",
            },
            {
                id: "C2",
                title: "Problem Structuring",
                prompt: "A school event failed because no one attended. List 3 possible reasons and 1 fix.",
                minWords: 50,
                maxWords: 200,
                domain: "A",
            },
            {
                id: "C3",
                title: "Interpretation",
                prompt: "A chart shows student attendance dropping every month. What does this most likely indicate?",
                minWords: 40,
                maxWords: 100,
                domain: "A",
            },
            {
                id: "C4",
                title: "Planning Task",
                prompt: "You have 2 hours to complete 3 tasks with the same deadline. How will you plan and why?",
                minWords: 60,
                maxWords: 150,
                domain: "S",
            },
        ],
    },
    D: {
        id: "D",
        title: "Friction & Comfort",
        subtitle: "What drains you",
        description: "Identify psychological comfort and stress points",
        icon: "Lightbulb",
        color: "#F59E0B",
        type: "friction-assessment",
        questions: [
            {
                id: "D1",
                question: "When your work is judged publicly, you mostly feel:",
                options: [
                    { text: "Excited", friction: "low", score: 2 },
                    { text: "Motivated", friction: "low", score: 2 },
                    { text: "Neutral", friction: "medium", score: 1 },
                    { text: "Anxious", friction: "high", score: 0 },
                ],
            },
            {
                id: "D2",
                question: "After failing at something important, you usually:",
                options: [
                    { text: "Try again immediately", friction: "low", score: 2 },
                    { text: "Reflect and retry later", friction: "low", score: 2 },
                    { text: "Avoid similar situations", friction: "high", score: 0 },
                    { text: "Feel stuck for long", friction: "high", score: 0 },
                ],
            },
            {
                id: "D3",
                question: "When adults strongly suggest a career path, you feel:",
                options: [
                    { text: "Supported", friction: "low", score: 2 },
                    { text: "Thoughtful but independent", friction: "low", score: 2 },
                    { text: "Pressured", friction: "medium", score: 1 },
                    { text: "Shut down", friction: "high", score: 0 },
                ],
            },
            {
                id: "D4",
                question: "In disagreements, you prefer to:",
                options: [
                    { text: "Debate openly", friction: "low", score: 2 },
                    { text: "Calmly mediate", friction: "low", score: 2 },
                    { text: "Stay quiet", friction: "medium", score: 1 },
                    { text: "Avoid completely", friction: "high", score: 0 },
                ],
            },
            {
                id: "D5",
                question: "You feel most motivated when:",
                options: [
                    { text: "The work feels meaningful", friction: "low", score: 2 },
                    { text: "You want mastery", friction: "low", score: 2 },
                    { text: "You are helping others", friction: "low", score: 2 },
                    { text: "You receive recognition", friction: "low", score: 2 },
                ],
            },
        ],
    },
};

// Domain labels
export const domains = {
    A: "Analytical",
    C: "Creative",
    S: "Social / Empathic",
    P: "Physical / Action",
};

// Career clusters
export const careerClusters = {
    CS: {
        name: "Creative Communicators",
        domains: ["C", "S"],
        description: "You combine creativity with people skills",
        color: "#FF6B6B",
        careers: {
            explore: [
                "School media club",
                "Blogging / journaling",
                "Social media content creation",
                "Debate / drama club",
            ],
            develop: [
                "Content writing",
                "Journalism (student / junior)",
                "Graphic / UX design",
                "Digital marketing",
                "Media & communications",
            ],
            advanced: [
                "Brand strategist",
                "Creative director (long-term)",
                "Author / screenwriter",
                "Senior UX writer",
            ],
        },
    },
    AP: {
        name: "Analytical Builders",
        domains: ["A", "P"],
        description: "You excel at logical thinking and hands-on work",
        color: "#8B5CF6",
        careers: {
            explore: [
                "Coding basics",
                "Robotics kits",
                "Logic & math clubs",
                "DIY building projects",
            ],
            develop: [
                "Software development",
                "Engineering pathways",
                "Data analysis",
                "Product engineering",
            ],
            advanced: [
                "Systems architect",
                "Data scientist",
                "R&D engineer",
                "Technical lead roles",
            ],
        },
    },
    AS: {
        name: "Strategic Operators",
        domains: ["A", "S"],
        description: "You balance logic with people understanding",
        color: "#10B981",
        careers: {
            explore: [
                "Event planning roles",
                "Student council",
                "Case study games",
            ],
            develop: [
                "Business management",
                "Operations & logistics",
                "Project coordination",
                "Consulting (junior)",
            ],
            advanced: [
                "Product manager",
                "Strategy consultant",
                "Entrepreneur / founder",
                "Operations head",
            ],
        },
    },
    SC: {
        name: "Empathic Facilitators",
        domains: ["S", "C"],
        description: "You combine empathy with creative expression",
        color: "#F59E0B",
        careers: {
            explore: [
                "Peer mentoring",
                "Volunteering roles",
                "Teaching assistance",
            ],
            develop: [
                "Psychology / counselling (academic path)",
                "Social work",
                "HR / people operations",
                "Education & training",
            ],
            advanced: [
                "Clinical psychologist (with qualifications)",
                "Organizational development specialist",
                "Senior educator / academic",
            ],
        },
    },
    P: {
        name: "Physical Performers",
        domains: ["P"],
        description: "You thrive in action and physical activities",
        color: "#EF4444",
        careers: {
            explore: [
                "School / local sports",
                "Fitness training",
                "Performing arts basics",
            ],
            develop: [
                "Professional sports pathways",
                "Physiotherapy",
                "Defense services",
                "Performance arts",
            ],
            advanced: [
                "Elite athlete / coach",
                "Sports science specialist",
                "Emergency response leadership",
            ],
        },
    },
};
