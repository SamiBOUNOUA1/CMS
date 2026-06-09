// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Order, Product } from '@/lib/models';

export async function GET(request: NextRequest, { params }: { params: Record<string, string> }) {
  const permsHeader = request.headers.get('x-user-permissions');
  const perms = permsHeader ? JSON.parse(permsHeader) : {};
  if (!perms.view_kitchen) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectDB();

  const order = await Order.findById(params.id).select('lineGroups').lean();
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Collect all _productId strings and their total counts across all groups
  const productCountMap = new Map<string, number>();
  for (const group of order.lineGroups ?? []) {
    const groupCount = Number(group.count) || 1;
    for (const item of group.items ?? []) {
      if (!item._productId) continue;
      productCountMap.set(item._productId, (productCountMap.get(item._productId) ?? 0) + groupCount);
    }
  }

  if (productCountMap.size === 0) {
    return NextResponse.json({ dishes: [] });
  }

  const productIds = Array.from(productCountMap.keys());

  // Fetch products that have a linkedRecipe, populating recipe ingredients with stock info
  const products = await Product.find({ _id: { $in: productIds }, linkedRecipe: { $ne: null } })
    .populate({
      path: 'linkedRecipe',
      populate: { path: 'ingredients.stockItem', select: 'name unit currentStock' },
    })
    .lean();

  if (products.length === 0) {
    return NextResponse.json({ dishes: [] });
  }

  const dishes = products.map(product => {
    const count = productCountMap.get(product._id.toString()) ?? 1;
    const recipe = product.linkedRecipe;

    const ingredients = (recipe.ingredients ?? [])
      .filter(ing => ing.stockItem)
      .map(ing => {
        const needed = Math.round((Number(ing.quantity) || 0) * count * 1000) / 1000;
        const currentStock = Number(ing.stockItem.currentStock) || 0;
        return {
          stockItemId: ing.stockItem._id.toString(),
          name: ing.stockItem.name,
          unit: ing.stockItem.unit || ing.unit || '',
          needed,
          currentStock,
          toAdd: Math.max(0, Math.round((needed - currentStock) * 1000) / 1000),
        };
      });

    return {
      productId: product._id.toString(),
      productName: product.name,
      recipeName: recipe.name,
      count,
      ingredients,
    };
  });

  return NextResponse.json({ dishes });
}
