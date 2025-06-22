import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, PieChart, FileSpreadsheet } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Sales Pipeline Analytics
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Transform your sales data into actionable insights with advanced analytics, 
            predictive modeling, and comprehensive reporting tools.
          </p>
          <Button 
            size="lg"
            onClick={() => window.location.href = '/api/login'}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
          >
            Sign In to Get Started
          </Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="text-center">
            <CardHeader>
              <BarChart3 className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <CardTitle>Pipeline Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Track deal progression and identify bottlenecks in your sales process
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <TrendingUp className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <CardTitle>Predictive Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Forecast revenue and predict deal outcomes with advanced analytics
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <PieChart className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <CardTitle>Stage Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Visualize deal distribution across sales stages and time periods
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <FileSpreadsheet className="h-12 w-12 text-orange-600 mx-auto mb-4" />
              <CardTitle>Excel Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Import and analyze data directly from your existing Excel reports
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Ready to optimize your sales pipeline?
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Sign in to access your personalized analytics dashboard and start making data-driven decisions.
          </p>
          <Button 
            variant="outline"
            onClick={() => window.location.href = '/api/login'}
            className="border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white"
          >
            Access Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}