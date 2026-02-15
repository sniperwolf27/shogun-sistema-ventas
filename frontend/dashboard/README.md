# Shogun Dashboard

Modern glass morphism dashboard for Shogun clothing store, built with Next.js 14 and optimized for production performance.

## Features

- ✨ **Glass Morphism UI**: Realistic glass effect with performance constraints
- 🎯 **Performance Optimized**: Max 3 backdrop-filter surfaces, CSS containment, optimized animations
- ♿ **Accessible**: WCAG AA contrast ratios, keyboard navigation, screen reader support
- 📊 **Real-time Data**: Integrates with Flask API backend
- 🎨 **Aurora Background**: Subtle static gradient background with noise overlay
- 📱 **Responsive**: Works on mobile, tablet, and desktop

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: TailwindCSS with custom design tokens
- **Charts**: Recharts (optimized for performance)
- **No unnecessary dependencies**: Minimal bundle size

## Getting Started

### Prerequisites

- Node.js 18.17.0 or higher
- npm or yarn
- Flask backend running on `http://localhost:5000`

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local

# Edit .env.local with your API endpoint
NEXT_PUBLIC_API_BASE=http://localhost:5000/api
```

### Development

```bash
# Start development server
npm run dev

# Open http://localhost:3000 in your browser
```

### Build for Production

```bash
# Build optimized production bundle
npm run build

# Start production server
npm start
```

## Architecture

### Performance Budget

The dashboard enforces a **strict backdrop-filter budget** of 3 surfaces maximum:

1. Weekly Trend Chart (elevated glass)
2. Best Seller Card (elevated glass)
3. Stock Alert Card (elevated glass)

All other cards use solid backgrounds to maintain 60fps performance on corporate laptops.

### Design Tokens

Custom Tailwind configuration with Shogun brand colors:

- **Accent**: `#0071E3` (Apple-inspired blue)
- **Success**: `#34C759`
- **Warning**: `#FF9F0A`
- **Danger**: `#FF3B30`

### Component Structure

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout with GlassProvider
│   ├── page.tsx           # Dashboard page
│   └── globals.css        # Global styles + aurora background
│
├── components/
│   ├── providers/         # Context providers
│   │   └── GlassProvider.tsx  # Backdrop-filter budget tracker
│   │
│   ├── ui/                # Reusable UI components
│   │   ├── GlassCard.tsx      # Core glass component (3 variants)
│   │   ├── MetricCard.tsx     # KPI display
│   │   ├── Badge.tsx          # Status indicators
│   │   └── ChartCard.tsx      # Chart wrapper
│   │
│   └── dashboard/         # Dashboard-specific components
│       ├── MetricsGrid.tsx
│       ├── WeeklyTrendChart.tsx
│       ├── BestSellerCard.tsx
│       └── StockAlertCard.tsx
│
└── lib/                   # Utilities and services
    ├── api.ts            # Flask API client
    ├── types.ts          # TypeScript interfaces
    └── utils.ts          # Helper functions
```

## API Integration

The dashboard connects to the Flask backend at `/api/estadisticas`:

- `GET /api/estadisticas` - Main dashboard statistics
- `GET /api/estadisticas/canales` - Sales by channel
- `GET /api/estadisticas/estados` - Orders by status

If the API is unavailable, the dashboard automatically falls back to mock data.

## Performance Optimizations

- **CSS Containment**: All glass cards use `contain: layout style`
- **Layer Promotion**: `will-change` only on hover states (not persistent)
- **Recharts Optimization**: ES6 module imports, no animations
- **Static Gradients**: Aurora background is static (no expensive animations)
- **Minimal Dependencies**: Only essential packages included

## Accessibility

- ✅ WCAG AA contrast ratios (4.5:1 for text, 3:1 for UI)
- ✅ Keyboard navigation with visible focus rings
- ✅ Screen reader friendly
- ✅ `prefers-reduced-motion` support

## Browser Support

- Chrome/Edge 103+ (backdrop-filter support)
- Firefox 103+ (backdrop-filter support)
- Safari 15.4+ (backdrop-filter support)

Older browsers automatically fall back to solid backgrounds.

## Deployment

### Option 1: Standalone Server (Recommended)

```bash
npm run build
npm start
```

Server runs on port 3000. Use reverse proxy (nginx) in production.

### Option 2: Static Export

```javascript
// next.config.js
module.exports = {
  output: 'export',
};
```

Then serve static files with Flask.

## Troubleshooting

### Port 3000 already in use

```bash
# Use different port
PORT=3001 npm run dev
```

### API connection errors

Check that Flask backend is running on `http://localhost:5000` and CORS is enabled.

### Blur effects not working

Check browser support for `backdrop-filter`. The app automatically falls back to solid backgrounds.

## Development Notes

- **Budget Tracker**: GlassProvider logs blur surface usage in dev console
- **Performance**: Use Chrome DevTools Performance tab to verify 60fps
- **Accessibility**: Run Lighthouse audit regularly

## License

Proprietary - Shogun Sistema de Ventas

## Support

For issues or questions, contact the development team.
