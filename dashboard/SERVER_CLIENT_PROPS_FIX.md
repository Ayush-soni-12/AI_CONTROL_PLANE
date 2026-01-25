# Server-to-Client Component Props Fix

## 🐛 Problem

When passing props from a **Server Component** to a **Client Component** in Next.js, you can only pass **plain objects** (serializable data). You **cannot** pass:

- ❌ React component classes
- ❌ Functions
- ❌ Class instances
- ❌ Symbols

### **The Error:**

```
Only plain objects can be passed to Client Components from Server Components.
Classes or other objects with methods are not supported.
  {icon: {$$typeof: ..., render: ...}, ...}
         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
```

This happened because we were passing `Cpu`, `BarChart3`, etc. (React components) as props.

---

## ✅ Solution

Pass **icon names as strings** from the server component, then **map them to components** in the client component.

### **Before (❌ Broken):**

**Server Component (page.tsx):**

```typescript
import { Cpu, BarChart3 } from "lucide-react";

const features = [
  {
    icon: Cpu, // ❌ Can't pass component class!
    title: "AI-Powered",
    ...
  }
];

<AnimatedSections features={features} />
```

**Client Component (AnimatedSections.tsx):**

```typescript
features.map(feature => (
  <feature.icon /> // ❌ Receives undefined
))
```

---

### **After (✅ Fixed):**

**Server Component (page.tsx):**

```typescript
// Only import Globe for footer
import { Globe } from "lucide-react";

const features = [
  {
    icon: "Cpu", // ✅ Pass string name!
    title: "AI-Powered",
    ...
  },
  {
    icon: "BarChart3", // ✅ String
    ...
  }
];

<AnimatedSections features={features} />
```

**Client Component (AnimatedSections.tsx):**

```typescript
import { Cpu, BarChart3, Shield, Zap, Lock, Brain, LucideIcon } from "lucide-react";

// Create mapping
const iconMap: Record<string, LucideIcon> = {
  Cpu,
  BarChart3,
  Shield,
  Zap,
  Lock,
  Brain
};

// In render:
{features.map(feature => {
  const IconComponent = iconMap[feature.icon]; // ✅ Get component from map
  return IconComponent ? <IconComponent /> : null;
})}
```

---

## 🔍 How It Works

### **Data Flow:**

```
Server Component (page.tsx)
    ↓
Pass string: "Cpu"
    ↓
Client Component (AnimatedSections.tsx)
    ↓
Look up in iconMap: iconMap["Cpu"]
    ↓
Get component: Cpu
    ↓
Render: <Cpu />
```

---

## 📝 Code Changes

### **1. Server Component (app/page.tsx)**

```typescript
// Before
import { BarChart3, Cpu, Shield, Zap, Globe, Lock, Brain } from "lucide-react";

const features = [
  { icon: Cpu, ... },      // ❌ Component class
  { icon: BarChart3, ... } // ❌ Component class
];

// After
import { Globe } from "lucide-react"; // Only what we use directly

const features = [
  { icon: "Cpu", ... },      // ✅ String
  { icon: "BarChart3", ... } // ✅ String
];
```

---

### **2. Client Component (AnimatedSections.tsx)**

```typescript
// Added imports
import {
  Cpu,
  BarChart3,
  Shield,
  Zap,
  Lock,
  Brain,
  LucideIcon
} from "lucide-react";

// Added icon mapping
const iconMap: Record<string, LucideIcon> = {
  Cpu,
  BarChart3,
  Shield,
  Zap,
  Lock,
  Brain
};

// Updated interface
interface AnimatedSectionsProps {
  features: Array<{
    icon: string; // ✅ Changed from 'any' to 'string'
    ...
  }>;
}

// Updated render logic
{(() => {
  const IconComponent = iconMap[feature.icon];
  return IconComponent ? (
    <IconComponent className="..." />
  ) : null;
})()}
```

---

## 🎯 Key Concepts

### **Serialization:**

When Next.js sends data from server to client, it **serializes** the data (converts to JSON). Only these types can be serialized:

- ✅ Strings
- ✅ Numbers
- ✅ Booleans
- ✅ Arrays
- ✅ Plain objects
- ✅ null/undefined

### **Why This Pattern Works:**

1. Server sends **string** ("Cpu") → Serializable ✅
2. Client receives **string** → Deserializes ✅
3. Client **maps string to component** → Renders ✅

---

## 💡 Alternative Solutions

### **Option 1: Icon Name Mapping (Current)**

✅ Clean separation
✅ Type-safe
✅ Easy to maintain

```typescript
const iconMap = { Cpu, BarChart3, ... };
const Icon = iconMap[feature.icon];
```

---

### **Option 2: Dynamic Import (Not Recommended)**

❌ More complex
❌ Async loading
❌ Harder to type

```typescript
const Icon = await import(`lucide-react/${feature.icon}`);
```

---

### **Option 3: All Client Component (Not Recommended)**

❌ Loses server component benefits
❌ Larger bundle
❌ Slower initial load

```typescript
"use client"; // Make entire page client component
```

---

## 🧪 Testing

### **Verify It Works:**

1. Visit homepage
2. Check console for errors → Should be none ✅
3. Scroll to features section
4. Verify all 6 icons render correctly:
   - Cpu icon
   - BarChart3 icon
   - Shield icon
   - Zap icon
   - Lock icon
   - Brain icon

---

## 📚 Summary

### **Problem:**

- Can't pass React components from server to client

### **Solution:**

- Pass icon names as strings
- Map strings to components in client

### **Benefits:**

- ✅ Server component stays server component
- ✅ Cacheable and fast
- ✅ Type-safe with TypeScript
- ✅ Easy to add new icons

### **Files Changed:**

1. `app/page.tsx` - Changed icon references to strings
2. `components/home/AnimatedSections.tsx` - Added icon mapping

---

## 🎓 Learn More

**Next.js Documentation:**

- [Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Client Components](https://nextjs.org/docs/app/building-your-application/rendering/client-components)
- [Passing Props](https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns#passing-props-from-server-to-client-components-serialization)

**Key Rule:**

> Only serializable props can be passed from Server to Client Components.

Your homepage is now working correctly! 🚀
