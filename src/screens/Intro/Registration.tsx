import React from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';

import ScrollingPosters from './ScrollingPosters';
import Button from 'app/components/Button';
import { white } from 'app/constants/colors';
import { IntroNavigatorParamList } from 'app/navigation/Intro';
import Apple from 'app/components/Auth/Apple';
import Facebook from 'app/components/Auth/Facebook';

export default function RegistrationScreen({
  navigation,
}: {
  navigation: StackNavigationProp<IntroNavigatorParamList, 'Intro'>;
}) {
  return (
    <View style={{ flexDirection: 'column', flex: 1 }}>
      <ScrollingPosters />
      <View
        style={{
          flex: 8,
          alignItems: 'stretch',
          justifyContent: 'center',
          flexDirection: 'column',
        }}>
        <View>
          <Apple
            style={{
              height: 47,
              marginRight: 16,
              marginLeft: 16,
              marginBottom: 4,
            }}
           onFailure={error => URIError}/> //TODO: probs bad
          <Facebook />
          <Button
            kind="outline"
            onPress={() => navigation.navigate('Auth', { tab: 'sign-up' })}
            bare>
            <Text style={{ color: white, fontSize: 17, fontWeight: '600' }}>
              Create an Account
            </Text>
          </Button>
          <TouchableOpacity
            onPress={() => navigation.navigate('Auth', { tab: 'sign-in' })}>
            <Text
              style={{
                fontSize: 15,
                color: white,
                textAlign: 'center',
                lineHeight: 40,
                opacity: 0.75,
              }}>
              Already have an account?
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
