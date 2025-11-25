"use client";

/**
 * Vale Refeição Calculator Component
 *
 * Calculator for meal allowance (Vale Refeição) for monthly employees
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/format-utils';

interface ValeRefeicaoCalculatorProps {
  valorDia?: number;
  diasMes?: number;
  onChange: (valorDia: number, diasMes: number, totalCalculado: number) => void;
  readOnly?: boolean;
}

export function ValeRefeicaoCalculator({
  valorDia = 0,
  diasMes = 22,
  onChange,
  readOnly = false
}: ValeRefeicaoCalculatorProps) {
  const [valor, setValor] = useState(valorDia);
  const [dias, setDias] = useState(diasMes);

  const totalVR = valor * dias;

  useEffect(() => {
    onChange(valor, dias, totalVR);
  }, [valor, dias, totalVR]);

  if (readOnly) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Vale Refeição (VR)</CardTitle>
          <CardDescription>Cálculo do vale refeição mensal</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-gray-600">Valor diário</Label>
              <p className="text-lg font-semibold">{formatCurrency(valor)}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-600">Dias no mês</Label>
              <p className="text-lg font-semibold">{dias}</p>
            </div>
          </div>
          <div className="pt-4 border-t">
            <Label className="text-sm text-gray-600">VR mensal estimado</Label>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalVR)}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Calculadora de Vale Refeição (VR)</CardTitle>
        <CardDescription>Configure o valor diário e quantidade de dias</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="vr-valor-dia">Valor diário de Vale Refeição (R$)</Label>
            <Input
              id="vr-valor-dia"
              type="number"
              step="0.01"
              min="0"
              value={valor}
              onChange={(e) => setValor(parseFloat(e.target.value) || 0)}
              placeholder="Ex: 35.00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vr-dias-mes">Quantidade de dias de VR no mês</Label>
            <Input
              id="vr-dias-mes"
              type="number"
              min="0"
              max="31"
              value={dias}
              onChange={(e) => setDias(parseInt(e.target.value) || 0)}
              placeholder="Ex: 22"
            />
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="flex justify-between items-center">
            <Label className="text-base">VR mensal estimado:</Label>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalVR)}</p>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            {dias} dias × {formatCurrency(valor)} = {formatCurrency(totalVR)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
