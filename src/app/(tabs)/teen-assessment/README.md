# Teen Strength–Interest Assessment MVP

## Overview

A comprehensive digital assessment tool for adolescents (ages 13-19) that helps identify:
- **Natural Interests** (what they like)
- **Natural Strengths** (how their brain processes information)
- **Current Skills** (what they can do today)
- **Friction/Resistance** (what drains or stresses them)

## Features Implemented

### ✅ Complete Assessment Flow
1. **Landing Page** (`index.jsx`) - Introduction and module overview
2. **Profile Setup** (`profile.jsx`) - Age verification, parent email (optional), consent
3. **4 Assessment Modules** (`module.jsx`) - Different question types for each module
4. **Report Generation** (`report.jsx`) - Dual-view reports for teens and parents

### ✅ Four Independent Modules

#### Module A: Natural Liking (Interest)
- **Type**: Multiple choice, situational questions
- **Questions**: 5 forced-choice scenarios
- **Scoring**: +2 points per domain based on selected option
- **Purpose**: Identify intrinsic motivation

#### Module B: Natural Strength (Cognitive Ease)
- **Type**: Timed quiz, micro-tasks
- **Questions**: 5 logic/pattern questions
- **Scoring**: +2 for correct answer, +1 bonus if answered in <10 seconds
- **Purpose**: Measure cognitive processing speed and accuracy

#### Module C: Current Skill (Execution)
- **Type**: Open-ended text responses
- **Tasks**: 4 writing/planning prompts
- **Scoring**: 0-5 scale based on structure, clarity, word count
- **Purpose**: Assess present-day execution ability

#### Module D: Friction & Comfort (Mental Load)
- **Type**: Situational multiple choice
- **Questions**: 5 stress/motivation scenarios
- **Scoring**: Low friction = +2, Medium = +1, High = 0
- **Purpose**: Identify psychological comfort zones and burnout risks

### ✅ Four Core Domains

All questions map to one of four domains:
- **A**: Analytical
- **C**: Creative
- **S**: Social / Empathic
- **P**: Physical / Action

### ✅ Career Cluster Logic

The system suggests up to 2 career clusters based on:
- **Interest** ≥ 6
- **Strength** ≥ 5
- **Comfort** ≥ 5

**Available Clusters**:
1. **Creative Communicators** (C + S) - Content, journalism, UX design
2. **Analytical Builders** (A + P) - Engineering, coding, data science
3. **Strategic Operators** (A + S) - Business, operations, consulting
4. **Empathic Facilitators** (S + C) - Psychology, education, social work
5. **Physical Performers** (P) - Sports, fitness, performing arts

**Skill-Based Career Opportunities**:
- **Explore (0-4)**: Beginner activities (clubs, basics)
- **Develop (5-7)**: Skill-building pathways (courses, junior roles)
- **Advanced (8-10)**: Professional-level opportunities

### ✅ Report System

#### Teen Report (Encouraging Tone)
- How your brain naturally works
- What gives you energy
- What feels draining (for now)
- Best growth zones
- Safe things to try next
- ❌ No labels, job titles, or negative language

#### Parent Report (Calming Tone)
- Summary snapshot
- Detailed domain scores (Interest, Strength, Skill, Comfort)
- Burnout risk warnings
- Career clusters explained
- How to support (DOs and DON'Ts)
- Development timeline by age
- ⚠️ Clear disclaimer: "Not a diagnosis"

### ✅ Data Storage

All data is stored locally using AsyncStorage:
- `teenAssessmentProfile` - Age, parent email, start time
- `teenAssessmentProgress` - Current module, completed modules, completion status
- `teenAssessmentResults` - Module scores and responses

### ✅ UI/UX Highlights

- **Premium gradient cards** matching app design language
- **Progress tracking** with visual indicators
- **Module-specific color coding**
- **Pausable/resumable** assessment flow
- **Real-time validation** (age, word count, selections)
- **Smooth transitions** between modules
- **Dual-view toggle** for teen vs parent reports

## File Structure

```
teen-assessment/
├── _layout.jsx          # Navigation layout
├── index.jsx            # Landing/home screen
├── profile.jsx          # Profile setup & consent
├── module.jsx           # Universal module screen (all types)
├── report.jsx           # Dual-view report generation
└── assessmentData.js    # Question bank & career data
```

## Key Non-Negotiables (As Per Spec)

✅ **Four dimensions scored independently** (never merged)  
✅ **No medical/psychological diagnosis**  
✅ **No IQ test or ranking**  
✅ **No job prediction or final careers**  
✅ **Always labeled as "exploration options"**  
✅ **Max 2 clusters shown per user**  
✅ **Max 5 opportunities per cluster**  
✅ **No salary comparisons or probability percentages**  
✅ **Clear disclaimers throughout**  

## Future Enhancements

### 1. Advanced Skill Scoring (Module C)
- Integrate AI/NLP for better text analysis
- Evaluate structure, clarity, and practicality more accurately

### 2. Export Features
- PDF generation for teen and parent reports
- Email sharing functionality
- Save reports to device

### 3. Multi-Language Support
- Translate all questions and reports
- Maintain cultural sensitivity in career suggestions

### 4. Progress Analytics
- Track assessment completion rates
- Identify common patterns
- Anonymized data insights for counselors

### 5. Gamification
- Achievement badges for completing modules
- Visual progress animations
- Confetti/celebration effects

### 6. Accessibility
- Screen reader support
- Larger font options
- High-contrast mode

## Testing Notes

To test the full flow:
1. Navigate to Assessment tab
2. Click on "Teen Assessment" card
3. Enter age (13-19) and optionally parent email
4. Complete all 4 modules in order
5. View dual-mode report (Teen/Parent toggle)

## Credits

**Product Specification**: Client-provided comprehensive spec  
**Design System**: Amaha-inspired mental health UI  
**Implementation**: Antigravity AI Coding Assistant

---

**Disclaimer**: This assessment provides guidance for exploration, not medical diagnosis or career prediction. Always consult qualified professionals for clinical assessments.
