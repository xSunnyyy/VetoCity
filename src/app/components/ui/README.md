# UI Components Library

Reusable React components for the VetoCity application with consistent styling and behavior.

## Components

### Avatar

Display team or user avatars with automatic initials fallback.

```tsx
import { Avatar } from "@/app/components/ui";

<Avatar name="Team Name" avatarUrl={sleeperAvatarThumb(user.avatar)} size={32} />
```

**Props:**
- `name` (string, required): Team or user name
- `avatarUrl` (string | null, optional): URL to avatar image
- `size` (number, optional): Size in pixels (default: 32)
- `className` (string, optional): Additional CSS classes

---

### Badge / Chip

Display status indicators, labels, and tags.

```tsx
import { Badge, Chip, Chips } from "@/app/components/ui";

<Badge variant="success">Winner</Badge>
<Badge>+4</Badge>

<Chips items={["Player 1", "Player 2", "Player 3"]} />
```

**Badge Props:**
- `variant`: `"default" | "success" | "warning" | "error" | "info"`
- `className`: Additional CSS classes

**Chips Props:**
- `items` (string[], required): Array of items to display as chips

---

### Card

Card containers with consistent styling and optional hover effects.

```tsx
import { Card, CardHeader, CardContent, CardBox } from "@/app/components/ui";

<Card>
  <CardHeader
    title="Card Title"
    subtitle="Subtitle text"
    icon={<MyIcon />}
  />
  <CardContent>
    <CardBox>Inner content box</CardBox>
  </CardContent>
</Card>
```

**Card Props:**
- `hover` (boolean, optional): Enable hover effect (default: true)
- `className` (string, optional): Additional CSS classes

---

### TeamRow

Display team information with avatar, name, and score.

```tsx
import { TeamRow } from "@/app/components/ui";

<TeamRow
  team="Team Name"
  rosterId={1}
  score={125.4}
  avatarUrl={avatarUrl}
  avatarSize={28}
/>
```

**Props:**
- `team` (string, required): Team name
- `rosterId` (number, required): Roster ID
- `score` (number, optional): Score to display
- `avatarUrl` (string | null, optional): Avatar URL
- `avatarSize` (number, optional): Avatar size in pixels (default: 28)
- `rightContent` (ReactNode, optional): Custom content to display instead of score

---

### Loading States

Skeleton loaders and loading indicators.

```tsx
import { LoadingCard, LoadingState, LoadingSpinner, Skeleton, ErrorState } from "@/app/components/ui";

// Card grid loading
{loading && <LoadingCard count={6} />}

// Section loading
{loading && <LoadingState message="Loading data..." />}

// Custom skeleton
<Skeleton width="200px" height="20px" rounded="lg" />

// Error state
{error && <ErrorState title="Error" message={error} onRetry={refetch} />}
```

---

### Divider

Horizontal divider line.

```tsx
import { Divider } from "@/app/components/ui";

<Divider />
```

## Utilities

### cx()

Conditionally join class names (alternative to `clsx`).

```tsx
import { cx } from "@/app/lib/utils";

<div className={cx(
  "base-class",
  isActive && "active-class",
  isDisabled && "disabled-class"
)} />
```

### scoreFmt()

Format scores to one decimal place.

```tsx
import { scoreFmt } from "@/app/lib/utils";

scoreFmt(123.456) // "123.5"
```

### initials()

Generate initials from a name.

```tsx
import { initials } from "@/app/lib/utils";

initials("John Doe") // "JD"
```

### sleeperAvatarThumb()

Convert Sleeper avatar ID to thumbnail URL.

```tsx
import { sleeperAvatarThumb } from "@/app/lib/utils";

sleeperAvatarThumb(user.avatar) // "https://sleepercdn.com/avatars/thumbs/..."
```

## Custom Hooks

### useLeagueData()

Fetch league data with loading/error states.

```tsx
import { useLeagueData } from "@/app/hooks";

const { data, loading, error, refetch } = useLeagueData({ week: 1 });
```

### useStandings()

Fetch standings data.

```tsx
import { useStandings } from "@/app/hooks";

const { data, loading, error, refetch } = useStandings();
```

### useMatchups()

Fetch matchups data.

```tsx
import { useMatchups } from "@/app/hooks";

const { data, loading, error, refetch } = useMatchups(week);
```

## Migration Guide

### Before (Old Pattern)

```tsx
// Repeated in every file
function cx(...parts) { return parts.filter(Boolean).join(" "); }
function scoreFmt(n) { return (Math.round(n * 10) / 10).toFixed(1); }
function initials(name) { /* ... */ }

// Inline avatar component
<div className="relative shrink-0 overflow-hidden rounded-lg border border-zinc-800/80 bg-zinc-950/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]" style={{ width: "28px", height: "28px" }}>
  {avatarUrl ? <img src={avatarUrl} alt={name} /> : <div>{initials(name)}</div>}
</div>
```

### After (New Pattern)

```tsx
import { cx, scoreFmt, initials } from "@/app/lib/utils";
import { Avatar } from "@/app/components/ui";

<Avatar name={name} avatarUrl={avatarUrl} size={28} />
```

## Benefits

✅ **DRY (Don't Repeat Yourself)**: Utilities and components defined once
✅ **Consistent Styling**: All components use the same design tokens
✅ **Type Safety**: Full TypeScript support with prop validation
✅ **Easy Maintenance**: Update once, applies everywhere
✅ **Better Testing**: Components can be tested in isolation
✅ **Improved Performance**: React can optimize component re-renders
