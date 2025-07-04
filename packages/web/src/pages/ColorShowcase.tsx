import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Check, X, AlertCircle, Info } from 'lucide-react'

export function ColorShowcase() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-foreground mb-8">
          Corporate Digital Brain Farben
        </h1>

        {/* Signalfarben als Buttons */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">
            Signal-Farben als Buttons
          </h2>
          <div className="flex flex-wrap gap-4">
            <Button className="bg-corporate-blue hover:bg-corporate-blue/90">
              Primary Blue (#00afef)
            </Button>
            <Button className="bg-corporate-orange hover:bg-corporate-orange/90 text-corporate-dark">
              Accent Orange (#ffaa3a)
            </Button>
            <Button className="bg-corporate-green hover:bg-corporate-green/90">
              Success Green (#38b6ab)
            </Button>
            <Button className="bg-corporate-red hover:bg-corporate-red/90">
              Error Red (#ff3131)
            </Button>
          </div>
        </div>

        {/* Alerts mit Signalfarben */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">
            Alerts mit Corporate Farben
          </h2>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Standard Alert - verwendet die normalen Theme-Farben
            </AlertDescription>
          </Alert>

          <Alert variant="success">
            <Check className="h-4 w-4" />
            <AlertDescription>
              Success! Verwendet Corporate Green (#38b6ab)
            </AlertDescription>
          </Alert>

          <Alert variant="destructive">
            <X className="h-4 w-4" />
            <AlertDescription>
              Error! Verwendet Corporate Red (#ff3131)
            </AlertDescription>
          </Alert>

          <Alert className="border-corporate-orange bg-corporate-orange/20 text-corporate-orange dark:text-white">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Warning! Verwendet Corporate Orange (#ffaa3a)
            </AlertDescription>
          </Alert>
        </div>

        {/* Farbpalette */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">Komplette Farbpalette</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="h-24 rounded-lg bg-corporate-dark border-2 border-border" />
              <p className="mt-2 text-sm">Dark Blue</p>
              <p className="text-xs text-muted-foreground">#000e22</p>
            </div>
            <div className="text-center">
              <div className="h-24 rounded-lg bg-corporate-blue" />
              <p className="mt-2 text-sm">Primary Blue</p>
              <p className="text-xs text-muted-foreground">#00afef</p>
            </div>
            <div className="text-center">
              <div className="h-24 rounded-lg bg-corporate-orange" />
              <p className="mt-2 text-sm">Accent Orange</p>
              <p className="text-xs text-muted-foreground">#ffaa3a</p>
            </div>
            <div className="text-center">
              <div className="h-24 rounded-lg bg-corporate-red" />
              <p className="mt-2 text-sm">Error Red</p>
              <p className="text-xs text-muted-foreground">#ff3131</p>
            </div>
            <div className="text-center">
              <div className="h-24 rounded-lg bg-corporate-green" />
              <p className="mt-2 text-sm">Success Green</p>
              <p className="text-xs text-muted-foreground">#38b6ab</p>
            </div>
          </div>
        </div>

        {/* Beispiel-Karten */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">
            Karten mit Corporate Farben
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-card p-6 rounded-lg border-2 border-corporate-blue">
              <h3 className="text-lg font-semibold text-corporate-blue mb-2">
                Primary Action Card
              </h3>
              <p className="text-muted-foreground mb-4">
                Diese Karte verwendet den Corporate Blue Border
              </p>
              <Button className="bg-corporate-blue hover:bg-corporate-blue/90">
                Action
              </Button>
            </div>

            <div className="bg-corporate-orange/10 dark:bg-corporate-orange/20 p-6 rounded-lg border-2 border-corporate-orange">
              <h3 className="text-lg font-semibold text-corporate-orange dark:text-white mb-2">
                Accent Card
              </h3>
              <p className="text-muted-foreground mb-4">
                Diese Karte verwendet Corporate Orange
              </p>
              <Button className="bg-corporate-orange hover:bg-corporate-orange/90 text-corporate-dark">
                Accent Action
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
